//! Thumbnail generation via `QLThumbnailGenerator`.
//!
//! Generates a PNG thumbnail for a file using macOS Quick Look and saves it
//! to a cache directory. Returns the path to the cached file.

use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

use block2::RcBlock;
use crossbeam_channel::bounded;
use objc2::rc::Retained;
use objc2::AnyThread;
use objc2_app_kit::{NSBitmapImageFileType, NSBitmapImageRep};
use objc2_foundation::{NSData, NSDictionary, NSError, NSSize, NSString, NSURL};
use objc2_quick_look_thumbnailing::{
    QLThumbnailGenerationRequest, QLThumbnailGenerationRequestRepresentationTypes,
    QLThumbnailGenerator, QLThumbnailRepresentation,
};

/// Generate a thumbnail for a file and save it as PNG.
///
/// Uses `QLThumbnailGenerator` on macOS to create a thumbnail, converts it
/// to PNG via `NSBitmapImageRep`, and writes it to `cache_dir`.
///
/// Returns the path to the generated (or cached) PNG file.
pub fn generate_thumbnail(
    file_path: &Path,
    max_size: u32,
    cache_dir: &Path,
) -> Result<PathBuf, Box<dyn Error>> {
    if !file_path.exists() {
        return Err(format!("file not found: {}", file_path.display()).into());
    }

    fs::create_dir_all(cache_dir)?;

    // Build a deterministic cache key from the file path and requested size.
    let file_name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");
    let hash = fnv_hash(file_path.to_string_lossy().as_bytes());
    let png_name = format!("{}-{}-{:016x}.png", file_name, max_size, hash);
    let png_path = cache_dir.join(&png_name);

    // Return cached file if it exists and source hasn't been modified since.
    if png_path.exists() {
        let source_meta = fs::metadata(file_path)?;
        let cache_meta = fs::metadata(&png_path)?;
        let source_mtime = source_meta.modified()?;
        let cache_mtime = cache_meta.modified()?;

        if source_mtime <= cache_mtime {
            return Ok(png_path); // Cache hit — source unchanged
        }
        // Source is newer → fall through to regenerate
    }

    let png_data = generate_with_ql(file_path, max_size)?;
    fs::write(&png_path, &png_data)?;

    // Best-effort eviction — never fail thumbnail generation over cache cleanup.
    let _ = evict_cache_if_needed(cache_dir);

    Ok(png_path)
}

const MAX_CACHE_BYTES: u64 = 256 * 1024 * 1024;

fn evict_cache_if_needed(cache_dir: &Path) -> Result<(), Box<dyn Error>> {
    let mut entries: Vec<(PathBuf, u64, SystemTime)> = Vec::new();
    let mut total_size: u64 = 0;

    for entry in fs::read_dir(cache_dir)? {
        let entry = entry?;
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        if !meta.is_file() {
            continue;
        }
        let size = meta.len();
        let mtime = meta.modified().unwrap_or(SystemTime::UNIX_EPOCH);
        total_size += size;
        entries.push((entry.path(), size, mtime));
    }

    if total_size <= MAX_CACHE_BYTES {
        return Ok(());
    }

    entries.sort_by_key(|(_, _, mtime)| *mtime);

    for (path, size, _) in entries {
        if total_size <= MAX_CACHE_BYTES {
            break;
        }
        if fs::remove_file(&path).is_ok() {
            total_size -= size;
        }
    }

    Ok(())
}

/// Run the Quick Look thumbnail generator and return PNG bytes.
fn generate_with_ql(file_path: &Path, max_size: u32) -> Result<Vec<u8>, Box<dyn Error>> {
    objc2::rc::autoreleasepool(|_| {
        let path_ns = NSString::from_str(&file_path.to_string_lossy());
        let url = NSURL::fileURLWithPath(&path_ns);
        let size = NSSize::new(max_size as f64, max_size as f64);

        let request = unsafe {
            QLThumbnailGenerationRequest::initWithFileAtURL_size_scale_representationTypes(
                QLThumbnailGenerationRequest::alloc(),
                &url,
                size,
                1.0,
                QLThumbnailGenerationRequestRepresentationTypes::Thumbnail,
            )
        };

        let generator = unsafe { QLThumbnailGenerator::sharedGenerator() };

        let (tx, rx) = bounded(1);

        unsafe {
            generator.generateBestRepresentationForRequest_completionHandler(
                &request,
                &RcBlock::new(
                    move |thumbnail: *mut QLThumbnailRepresentation, _error: *mut NSError| {
                        let result = thumbnail.as_ref().and_then(|rep| {
                            let ns_image = rep.NSImage();
                            let tiff_data: Option<Retained<NSData>> = ns_image.TIFFRepresentation();
                            let tiff = tiff_data?;
                            let bitmap = NSBitmapImageRep::imageRepWithData(&*tiff)?;
                            let png: Retained<NSData> = bitmap.representationUsingType_properties(
                                NSBitmapImageFileType::PNG,
                                &NSDictionary::new(),
                            )?;
                            Some(png.to_vec())
                        });
                        let _ = tx.send(result);
                    },
                ),
            );
        }

        match rx.recv_timeout(Duration::from_secs(15)) {
            Ok(Some(data)) => Ok(data),
            Ok(None) => Err("thumbnail generation returned no data".into()),
            Err(_) => Err("thumbnail generation timed out".into()),
        }
    })
}

/// Simple FNV-1a hash for cache key derivation.
fn fnv_hash(data: &[u8]) -> u64 {
    let mut hash: u64 = 0xcbf29ce484222325;
    for &byte in data {
        hash ^= byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fnv_hash_deterministic() {
        let a = fnv_hash(b"/Users/test/file.txt");
        let b = fnv_hash(b"/Users/test/file.txt");
        assert_eq!(a, b);
    }

    #[test]
    fn fnv_hash_different_inputs() {
        let a = fnv_hash(b"/Users/test/a.txt");
        let b = fnv_hash(b"/Users/test/b.txt");
        assert_ne!(a, b);
    }

    #[test]
    fn generate_thumbnail_rejects_missing_file() {
        let result = generate_thumbnail(
            Path::new("/no/such/file/ray-fb-test-thumb"),
            512,
            Path::new("/tmp/ray-fb-thumbnails"),
        );
        assert!(result.is_err());
        let msg = result.unwrap_err().to_string();
        assert!(
            msg.contains("not found"),
            "expected 'not found', got: {msg}"
        );
    }

    #[test]
    fn mtime_invalidation_detects_stale_cache() {
        let tmp = std::env::temp_dir().join("ray-fb-test-mtime");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(&tmp).unwrap();

        let cache_dir = tmp.join("cache");
        let source_path = tmp.join("mtime_test.txt");

        fs::write(&source_path, b"original").unwrap();
        let source_meta = fs::metadata(&source_path).unwrap();
        let source_mtime = source_meta.modified().unwrap();

        let hash = fnv_hash(source_path.to_string_lossy().as_bytes());
        let png_name = format!("mtime_test.txt-128-{:016x}.png", hash);
        let png_path = cache_dir.join(&png_name);
        fs::create_dir_all(&cache_dir).unwrap();

        fs::write(&png_path, b"cached-png-data").unwrap();
        let cache_meta = fs::metadata(&png_path).unwrap();
        let cache_mtime = cache_meta.modified().unwrap();

        assert!(
            source_mtime <= cache_mtime,
            "precondition: source should not be newer than cache"
        );

        std::thread::sleep(Duration::from_millis(100));
        fs::write(&source_path, b"modified!").unwrap();

        let new_source_meta = fs::metadata(&source_path).unwrap();
        let new_source_mtime = new_source_meta.modified().unwrap();
        assert!(
            new_source_mtime > cache_mtime,
            "after write, source mtime should exceed cache mtime"
        );

        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn evict_cache_removes_oldest_until_under_limit() {
        let tmp = std::env::temp_dir().join("ray-fb-test-evict");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(&tmp).unwrap();

        for i in 0..5u64 {
            let file_path = tmp.join(format!("thumb-{}.png", i));
            fs::write(&file_path, vec![0u8; 30]).unwrap();
        }

        let total: u64 = 5 * 30;
        assert!(
            total < MAX_CACHE_BYTES,
            "150 bytes should be under the 256MB limit"
        );

        let result = evict_cache_if_needed(&tmp);
        assert!(result.is_ok(), "eviction should not error: {:?}", result);

        let remaining = fs::read_dir(&tmp).unwrap().filter_map(|e| e.ok()).count();
        assert_eq!(remaining, 5, "no files should be evicted when under limit");

        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn evict_cache_is_noop_when_under_limit() {
        let tmp = std::env::temp_dir().join("ray-fb-test-evict-small");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(&tmp).unwrap();

        let file_path = tmp.join("small.png");
        fs::write(&file_path, vec![0u8; 10]).unwrap();

        let result = evict_cache_if_needed(&tmp);
        assert!(result.is_ok());
        assert!(file_path.exists(), "small file should not be evicted");

        let _ = fs::remove_dir_all(&tmp);
    }
}
