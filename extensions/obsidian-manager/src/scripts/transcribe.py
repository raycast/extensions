#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "yt-dlp",
#     "whisperx",
# ]
# ///
import sys
import os
import json
import tempfile
import subprocess
import re
import glob
import yt_dlp
import whisperx

def get_video_info(youtube_url):
    """Get video title and metadata without downloading."""
    ydl_opts = {"quiet": True, "no_warnings": True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(youtube_url, download=False)
        return {
            "title": info.get("title", "Unknown"),
            "channel": info.get("channel", "Unknown"),
            "duration": info.get("duration", 0),
            "id": info.get("id", ""),
        }

def fetch_subtitles(youtube_url, output_dir, video_id):
    """Try to fetch existing subtitles from YouTube."""
    output_path = os.path.join(output_dir, "%(id)s.%(ext)s")
    ydl_opts = {
        "writeautomaticsub": True,
        "writesubtitles": True,
        "subtitleslangs": ["en"],
        "subtitlesformat": "vtt",
        "skip_download": True,
        "outtmpl": output_path,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([youtube_url])

        # Look for the VTT file
        vtt_patterns = [
            os.path.join(output_dir, f"{video_id}.en.vtt"),
            os.path.join(output_dir, f"{video_id}.en-*.vtt"),
        ]

        for pattern in vtt_patterns:
            matches = glob.glob(pattern)
            if matches:
                vtt_path = matches[0]
                with open(vtt_path, 'r', encoding='utf-8') as f:
                    raw = f.read()

                # Convert VTT to plain text
                lines = raw.split('\n')
                text_lines = []
                for line in lines:
                    # Skip headers, timestamps, and empty lines
                    if not line.strip():
                        continue
                    if line.startswith('WEBVTT'):
                        continue
                    if re.match(r'^\d+$', line.strip()):
                        continue
                    if '-->' in line:
                        continue
                    if line.startswith('NOTE'):
                        continue
                    # Remove VTT tags like <c> </c>
                    clean = re.sub(r'<[^>]+>', '', line)
                    if clean.strip():
                        text_lines.append(clean.strip())

                # Deduplicate consecutive lines (VTT often repeats)
                deduped = []
                for line in text_lines:
                    if not deduped or line != deduped[-1]:
                        deduped.append(line)

                transcript = ' '.join(deduped)
                transcript = re.sub(r'\s+', ' ', transcript).strip()

                # Remove VTT header lines that sometimes appear
                transcript = re.sub(r'^Kind:\s*\w+\s*Language:\s*\w+\s*', '', transcript).strip()

                if len(transcript) > 100:  # Sanity check
                    return transcript

        return None
    except Exception as e:
        print(f"Subtitle fetch failed: {e}", file=sys.stderr)
        return None

def download_audio(youtube_url, output_dir):
    """Download audio from YouTube video."""
    output_path = os.path.join(output_dir, "audio.%(ext)s")
    ydl_opts = {
        "format": "bestaudio/best",
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }],
        "outtmpl": output_path,
        "quiet": True,
        "no_warnings": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([youtube_url])
    return os.path.join(output_dir, "audio.mp3")

def get_audio_duration(audio_file):
    """Get audio duration in seconds using ffprobe."""
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", audio_file],
        capture_output=True, text=True
    )
    return float(result.stdout.strip())

def split_audio(audio_file, output_dir, chunk_length_sec=600):
    """Split audio into 10-minute chunks using ffmpeg."""
    duration = get_audio_duration(audio_file)
    chunks = []

    for i, start in enumerate(range(0, int(duration), chunk_length_sec)):
        chunk_file = os.path.join(output_dir, f"chunk_{i}.mp3")
        subprocess.run(
            ["ffmpeg", "-y", "-i", audio_file, "-ss", str(start),
             "-t", str(chunk_length_sec), "-acodec", "copy", chunk_file],
            capture_output=True
        )
        if os.path.exists(chunk_file) and os.path.getsize(chunk_file) > 0:
            chunks.append(chunk_file)

    return chunks

def transcribe_chunks(chunks):
    """Transcribe audio chunks using WhisperX."""
    model = whisperx.load_model("base", device="cpu", compute_type="float32", language="en")

    transcription = ""
    for i, chunk in enumerate(chunks):
        print(f"Transcribing chunk {i + 1}/{len(chunks)}...", file=sys.stderr)
        try:
            result = model.transcribe(chunk, language="en")
            if "segments" in result:
                text = " ".join([seg["text"] for seg in result["segments"]])
            else:
                text = result.get("text", "")
            transcription += text + " "
        except Exception as e:
            print(f"Error transcribing chunk {i + 1}: {e}", file=sys.stderr)
            transcription += "[Transcription failed] "

    return transcription.strip()

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No YouTube URL provided"}))
        sys.exit(1)

    youtube_url = sys.argv[1]

    # Get video info first
    print("Getting video info...", file=sys.stderr)
    try:
        info = get_video_info(youtube_url)
    except Exception as e:
        print(json.dumps({"error": f"Failed to get video info: {str(e)}"}))
        sys.exit(1)

    # Create temp directory for files
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            transcription = None

            # 1. Try to fetch existing subtitles first (much faster)
            print("Checking for subtitles...", file=sys.stderr)
            transcription = fetch_subtitles(youtube_url, temp_dir, info["id"])

            if transcription:
                print("Using YouTube subtitles", file=sys.stderr)
            else:
                # 2. Fall back to Whisper transcription
                print("No subtitles found, downloading audio...", file=sys.stderr)
                audio_file = download_audio(youtube_url, temp_dir)

                print("Splitting audio...", file=sys.stderr)
                chunks = split_audio(audio_file, temp_dir)

                print(f"Transcribing {len(chunks)} chunks with Whisper...", file=sys.stderr)
                transcription = transcribe_chunks(chunks)

            # Output result as JSON
            result = {
                "title": info["title"],
                "channel": info["channel"],
                "duration": info["duration"],
                "transcription": transcription,
            }
            print(json.dumps(result))

        except Exception as e:
            print(json.dumps({"error": str(e)}))
            sys.exit(1)

if __name__ == "__main__":
    main()
