import { Form, ActionPanel, Action, showToast, Toast, showInFinder, Icon, openCommandPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import {
  convertMedia,
  checkExtensionType,
  OUTPUT_VIDEO_EXTENSIONS,
  OUTPUT_AUDIO_EXTENSIONS,
  OUTPUT_IMAGE_EXTENSIONS,
  OUTPUT_ALL_EXTENSIONS,
  type MediaType,
  type AllOutputExtension,
  type QualitySettings,
  getDefaultQuality,
} from "../utils/converter";

export function ConverterForm({ initialFiles = [] }: { initialFiles?: string[] }) {
  const [selectedFileType, setSelectedFileType] = useState<MediaType | null>(null);
  const [currentFiles, setCurrentFiles] = useState<string[]>(initialFiles || []);
  const [outputFormat, setOutputFormat] = useState<AllOutputExtension | null>(null);
  const [currentQualitySetting, setCurrentQualitySetting] = useState<QualitySettings<AllOutputExtension> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      handleFileSelect(initialFiles);
    } else {
      // TODO: fix this
      setIsLoading(false);
    }
  }, [initialFiles]);

  const handleFileSelect = (files: string[]) => {
    if (files.length === 0) {
      setCurrentFiles([]);
      setSelectedFileType(null);
      return;
    }

    try {
      let primaryFileType: "video" | "image" | "audio" | false = false;
      for (const file of files) {
        const type = checkExtensionType(file);
        if (type) {
          primaryFileType = type as "video" | "image" | "audio";
          break; // Found the first valid file type
        }
      }

      if (!primaryFileType) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid selection",
          message: "No valid media files selected. Please select video, image, or audio files.",
        });
        setCurrentFiles([]);
        setSelectedFileType(null);
        return;
      }

      const processedFiles = files.filter((file) => {
        return checkExtensionType(file) === primaryFileType;
      });

      if (processedFiles.length < files.length) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid files in selection",
          message: `Kept ${processedFiles.length} ${primaryFileType} file${processedFiles.length > 1 ? "s" : ""}. ${files.length - processedFiles.length} other file${files.length - processedFiles.length > 1 ? "s" : ""} from your selection were invalid or of a different type and have been discarded.`,
        });
      }

      setCurrentFiles(processedFiles);
      setSelectedFileType(primaryFileType);

      // Initialize output format with default value based on file type
      if (primaryFileType === "image") {
        setOutputFormat(".jpg");
        setCurrentQualitySetting(getDefaultQuality(".jpg"));
      } else if (primaryFileType === "audio") {
        setOutputFormat(".mp3");
        setCurrentQualitySetting(getDefaultQuality(".mp3"));
      } else if (primaryFileType === "video") {
        setOutputFormat(".mp4");
        setCurrentQualitySetting(getDefaultQuality(".mp4"));
      }
    } catch (error) {
      const errorMessage = String(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error processing files",
        message: errorMessage,
      });
      setCurrentFiles([]);
      setSelectedFileType(null);
    }

    setIsLoading(false);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      // TODO: When converting video, we could show the progress percentage. This would require to find a solution when multiple files are being converted.
      // I don't think it is possible to show the progress of images. Unsure about audio.
      title: `Converting ${currentFiles.length} file${currentFiles.length > 1 ? "s" : ""}...`,
    });

    for (const item of currentFiles) {
      try {
        if (!outputFormat || !currentQualitySetting) {
          throw new Error("Output format and quality settings must be configured");
        }

        const outputPath = await convertMedia(item, outputFormat, currentQualitySetting);

        await toast.hide();
        await showToast({
          style: Toast.Style.Success,
          title: "File converted successfully!",
          message: "⌘O to open the file",
          primaryAction: {
            title: "Open File",
            shortcut: { modifiers: ["cmd"], key: "o" },
            onAction: () => {
              showInFinder(outputPath);
            },
          },
        });
      } catch (error) {
        await toast.hide();
        const errorMessage = String(error);

        // Check if the error is related to FFmpeg not being installed
        if (errorMessage.includes("FFmpeg is not installed or configured")) {
          showFailureToast(new Error("FFmpeg needs to be configured to convert files"), {
            title: "FFmpeg not found",
            primaryAction: {
              title: "Configure FFmpeg",
              onAction: () => {
                // Open command preferences to set FFmpeg path
                openCommandPreferences();
              },
            },
          });
        } else {
          await showToast({ style: Toast.Style.Failure, title: "Conversion failed", message: errorMessage });
        }
      }
    }
    setIsLoading(false);
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {currentFiles && currentFiles.length > 0 && selectedFileType && (
            <Action.SubmitForm
              title="Convert"
              onSubmit={handleSubmit}
              icon={Icon.NewDocument}
              // For some reason, this still shows up as cmd+return instead of just return, so no use for now
              /* shortcut={{ modifiers: [], key: "return" }} */
            />
          )}
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="selectFiles"
        title="Select files"
        allowMultipleSelection={true}
        value={currentFiles}
        onChange={(newFiles) => {
          handleFileSelect(newFiles);
        }}
      />
      {selectedFileType && (
        <Form.Dropdown
          id="format"
          title="Select output format"
          value={
            outputFormat || (selectedFileType === "image" ? ".jpg" : selectedFileType === "audio" ? ".mp3" : ".mp4")
          }
          onChange={(newFormat) => {
            const format = newFormat as AllOutputExtension;
            setOutputFormat(format);
            setCurrentQualitySetting(getDefaultQuality(format));
          }}
        >
          {selectedFileType === "image" ? (
            <Form.Dropdown.Section title="Image Formats">
              {/* HEIC is only supported on macOS with SIPS, so we filter it out on other platforms. */}
              {OUTPUT_IMAGE_EXTENSIONS.filter((format) => process.platform === "darwin" || format !== ".heic").map(
                (format) => (
                  <Form.Dropdown.Item key={format} value={format} title={format} />
                ),
              )}
            </Form.Dropdown.Section>
          ) : selectedFileType === "audio" ? (
            <Form.Dropdown.Section title="Audio Formats">
              {OUTPUT_AUDIO_EXTENSIONS.map((format) => (
                <Form.Dropdown.Item key={format} value={format} title={format} />
              ))}
            </Form.Dropdown.Section>
          ) : (
            <Form.Dropdown.Section title="Video Formats">
              {OUTPUT_VIDEO_EXTENSIONS.map((format) => (
                <Form.Dropdown.Item key={format} value={format} title={format} />
              ))}
            </Form.Dropdown.Section>
          )}
        </Form.Dropdown>
      )}
      {/* Quality Settings for Images */}
      {selectedFileType === "image" && outputFormat && OUTPUT_IMAGE_EXTENSIONS.includes(outputFormat as any) && (
        <QualitySettings 
          outputFormat={outputFormat}
          currentQuality={currentQualitySetting}
          onQualityChange={setCurrentQualitySetting}
        />
      )}
      {/* Quality Settings for Audio */}
      {selectedFileType === "audio" && outputFormat && OUTPUT_AUDIO_EXTENSIONS.includes(outputFormat as any) && (
        <QualitySettings 
          outputFormat={outputFormat}
          currentQuality={currentQualitySetting}
          onQualityChange={setCurrentQualitySetting}
        />
      )}
      {/* Quality Settings for Video */}
      {selectedFileType === "video" && outputFormat && OUTPUT_VIDEO_EXTENSIONS.includes(outputFormat as any) && (
        <QualitySettings 
          outputFormat={outputFormat}
          currentQuality={currentQualitySetting}
          onQualityChange={setCurrentQualitySetting}
        />
      )}
    </Form>
  );
}

// Quality Settings Component
function QualitySettings({ 
  outputFormat, 
  currentQuality, 
  onQualityChange 
}: {
  outputFormat: AllOutputExtension;
  currentQuality: QualitySettings<AllOutputExtension> | null;
  onQualityChange: (quality: QualitySettings<AllOutputExtension>) => void;
}) {
  // Image Quality Settings
  if (OUTPUT_IMAGE_EXTENSIONS.includes(outputFormat as any)) {
    return <ImageQualitySettings 
      outputFormat={outputFormat as any}
      currentQuality={currentQuality as any}
      onQualityChange={onQualityChange as any}
    />;
  }
  
  // Audio Quality Settings
  if (OUTPUT_AUDIO_EXTENSIONS.includes(outputFormat as any)) {
    return <AudioQualitySettings 
      outputFormat={outputFormat as any}
      currentQuality={currentQuality as any}
      onQualityChange={onQualityChange as any}
    />;
  }
  
  // Video Quality Settings
  if (OUTPUT_VIDEO_EXTENSIONS.includes(outputFormat as any)) {
    return <VideoQualitySettings 
      outputFormat={outputFormat as any}
      currentQuality={currentQuality as any}
      onQualityChange={onQualityChange as any}
    />;
  }
  
  return null;
}

// Image Quality Settings Component
function ImageQualitySettings({ outputFormat, currentQuality, onQualityChange }: any) {
  if (outputFormat === ".png") {
    return (
      <>
        <Form.Dropdown
          id="qualitySetting"
          title="Select quality"
          value={currentQuality || "png-24"}
          onChange={(value) => onQualityChange(value)}
        >
          <Form.Dropdown.Section>
            <Form.Dropdown.Item value="png-24" title="PNG-24 (24-bit RGB, full color)" />
            <Form.Dropdown.Item value="png-8" title="PNG-8 (8-bit indexed, 256 colors)" />
          </Form.Dropdown.Section>
        </Form.Dropdown>
        <Form.Description
          text="PNG-24 is lossless with full color range. PNG-8 uses indexed colors (256 max) for smaller file sizes. \nFFmpeg's PNG-8 implementation badly handles transparency."
        />
      </>
    );
  }
  
  if (outputFormat === ".webp") {
    return (
      <Form.Dropdown
        id="qualitySetting"
        title="Select quality"
        value={currentQuality || "80"}
        onChange={(value) => onQualityChange(value)}
      >
        <Form.Dropdown.Section>
          <Form.Dropdown.Item value="lossless" title="Lossless" />
          {[100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0].map((q) => (
            <Form.Dropdown.Item key={q} value={q.toString()} title={q.toString()} />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
    );
  }
  
  if (outputFormat === ".tiff") {
    return (
      <>
        <Form.Dropdown
          id="qualitySetting"
          title="Select compression"
          value={currentQuality || "deflate"}
          onChange={(value) => onQualityChange(value)}
        >
          <Form.Dropdown.Section>
            <Form.Dropdown.Item value="deflate" title="Deflate (recommended, smaller size)" />
            <Form.Dropdown.Item value="lzw" title="LZW (wider compatibility)" />
          </Form.Dropdown.Section>
        </Form.Dropdown>
        <Form.Description text="TIFF is always lossless." />
      </>
    );
  }
  
  // For .jpg, .heic, .avif - use percentage quality
  return (
    <Form.Dropdown
      id="qualitySetting"
      title="Select quality"
      value={currentQuality || "80"}
      onChange={(value) => onQualityChange(value)}
    >
      <Form.Dropdown.Section>
        {[100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0].map((q) => {
          const title = outputFormat === ".avif" && q === 100 ? "100 (lossless)" : q.toString();
          return <Form.Dropdown.Item key={q} value={q.toString()} title={title} />;
        })}
      </Form.Dropdown.Section>
    </Form.Dropdown>
  );
}

// Audio Quality Settings Component
function AudioQualitySettings({ outputFormat, currentQuality, onQualityChange }: any) {
  const [bitrate, setBitrate] = useState(currentQuality?.bitrate || "192");
  const [vbr, setVbr] = useState(currentQuality?.vbr || false);
  const [profile, setProfile] = useState(currentQuality?.profile || "aac_low");
  const [sampleRate, setSampleRate] = useState(currentQuality?.sampleRate || "44100");
  const [bitDepth, setBitDepth] = useState(currentQuality?.bitDepth || "16");
  const [compressionLevel, setCompressionLevel] = useState(currentQuality?.compressionLevel || "5");

  const updateQuality = () => {
    let quality: any = {};
    
    if (outputFormat === ".mp3") {
      quality = { bitrate, vbr };
    } else if (outputFormat === ".aac") {
      quality = { bitrate, profile };
    } else if (outputFormat === ".wav") {
      quality = { sampleRate, bitDepth };
    } else if (outputFormat === ".flac") {
      quality = { compressionLevel, sampleRate, bitDepth };
    }
    
    onQualityChange(quality);
  };

  useEffect(() => {
    updateQuality();
  }, [bitrate, vbr, profile, sampleRate, bitDepth, compressionLevel]);

  if (outputFormat === ".mp3") {
    return (
      <>
        <Form.Dropdown
          id="mp3Bitrate"
          title="Bitrate"
          value={bitrate}
          onChange={setBitrate}
        >
          {["64", "96", "128", "160", "192", "224", "256", "320"].map((rate) => (
            <Form.Dropdown.Item key={rate} value={rate} title={`${rate} kbps`} />
          ))}
        </Form.Dropdown>
        <Form.Checkbox
          id="mp3Vbr"
          title="Variable Bitrate (VBR)"
          label="Use variable bitrate encoding for better quality"
          value={vbr}
          onChange={setVbr}
        />
      </>
    );
  }

  if (outputFormat === ".aac") {
    return (
      <>
        <Form.Dropdown
          id="aacBitrate"
          title="Bitrate"
          value={bitrate}
          onChange={setBitrate}
        >
          {["64", "96", "128", "160", "192", "224", "256", "320"].map((rate) => (
            <Form.Dropdown.Item key={rate} value={rate} title={`${rate} kbps`} />
          ))}
        </Form.Dropdown>
        <Form.Dropdown
          id="aacProfile"
          title="AAC Profile"
          value={profile}
          onChange={setProfile}
        >
          <Form.Dropdown.Item value="aac_low" title="AAC Low Complexity (recommended)" />
          <Form.Dropdown.Item value="aac_he" title="AAC High Efficiency" />
          <Form.Dropdown.Item value="aac_he_v2" title="AAC High Efficiency v2" />
        </Form.Dropdown>
      </>
    );
  }

  if (outputFormat === ".wav") {
    return (
      <>
        <Form.Dropdown
          id="wavSampleRate"
          title="Sample Rate"
          value={sampleRate}
          onChange={setSampleRate}
        >
          <Form.Dropdown.Item value="22050" title="22,050 Hz" />
          <Form.Dropdown.Item value="44100" title="44,100 Hz (CD Quality)" />
          <Form.Dropdown.Item value="48000" title="48,000 Hz (Professional)" />
          <Form.Dropdown.Item value="96000" title="96,000 Hz (High-res)" />
        </Form.Dropdown>
        <Form.Dropdown
          id="wavBitDepth"
          title="Bit Depth"
          value={bitDepth}
          onChange={setBitDepth}
        >
          <Form.Dropdown.Item value="16" title="16-bit" />
          <Form.Dropdown.Item value="24" title="24-bit" />
          <Form.Dropdown.Item value="32" title="32-bit" />
        </Form.Dropdown>
      </>
    );
  }

  if (outputFormat === ".flac") {
    return (
      <>
        <Form.Dropdown
          id="flacCompression"
          title="Compression Level"
          value={compressionLevel}
          onChange={setCompressionLevel}
        >
          {["0", "1", "2", "3", "4", "5", "6", "7", "8"].map((level) => (
            <Form.Dropdown.Item key={level} value={level} title={`Level ${level} ${level === "5" ? "(recommended)" : ""}`} />
          ))}
        </Form.Dropdown>
        <Form.Dropdown
          id="flacSampleRate"
          title="Sample Rate"
          value={sampleRate}
          onChange={setSampleRate}
        >
          <Form.Dropdown.Item value="22050" title="22,050 Hz" />
          <Form.Dropdown.Item value="44100" title="44,100 Hz (CD Quality)" />
          <Form.Dropdown.Item value="48000" title="48,000 Hz (Professional)" />
          <Form.Dropdown.Item value="96000" title="96,000 Hz (High-res)" />
        </Form.Dropdown>
        <Form.Dropdown
          id="flacBitDepth"
          title="Bit Depth"
          value={bitDepth}
          onChange={setBitDepth}
        >
          <Form.Dropdown.Item value="16" title="16-bit" />
          <Form.Dropdown.Item value="24" title="24-bit" />
        </Form.Dropdown>
      </>
    );
  }

  return null;
}

// Video Quality Settings Component
function VideoQualitySettings({ outputFormat, currentQuality, onQualityChange }: any) {
  const [encodingMode, setEncodingMode] = useState(currentQuality?.encodingMode || "crf");
  const [crf, setCrf] = useState(currentQuality?.crf || "23");
  const [bitrate, setBitrate] = useState(currentQuality?.bitrate || "2000");
  const [maxBitrate, setMaxBitrate] = useState(currentQuality?.maxBitrate || "");
  const [preset, setPreset] = useState(currentQuality?.preset || "medium");
  const [variant, setVariant] = useState(currentQuality?.variant || "standard");
  const [quality, setQuality] = useState(currentQuality?.quality || "good");

  const updateQuality = () => {
    let qualitySettings: any = { encodingMode };
    
    if (outputFormat === ".mp4") {
      qualitySettings.preset = preset;
      if (encodingMode === "crf") {
        qualitySettings.crf = crf;
      } else {
        qualitySettings.bitrate = bitrate;
        if (maxBitrate) qualitySettings.maxBitrate = maxBitrate;
      }
    } else if (outputFormat === ".avi") {
      if (encodingMode === "crf") {
        qualitySettings.crf = crf;
      } else {
        qualitySettings.bitrate = bitrate;
      }
    } else if (outputFormat === ".mov") {
      qualitySettings = { variant };
    } else if (outputFormat === ".mkv") {
      qualitySettings.preset = preset;
      if (encodingMode === "crf") {
        qualitySettings.crf = crf;
      } else {
        qualitySettings.bitrate = bitrate;
        if (maxBitrate) qualitySettings.maxBitrate = maxBitrate;
      }
    } else if (outputFormat === ".mpg") {
      if (encodingMode === "crf") {
        qualitySettings.crf = crf;
      } else {
        qualitySettings.bitrate = bitrate;
      }
    } else if (outputFormat === ".webm") {
      qualitySettings.quality = quality;
      if (encodingMode === "crf") {
        qualitySettings.crf = crf;
      } else {
        qualitySettings.bitrate = bitrate;
        if (maxBitrate) qualitySettings.maxBitrate = maxBitrate;
      }
    }
    
    onQualityChange(qualitySettings);
  };

  useEffect(() => {
    updateQuality();
  }, [encodingMode, crf, bitrate, maxBitrate, preset, variant, quality]);

  if (outputFormat === ".mov") {
    return (
      <Form.Dropdown
        id="proresVariant"
        title="ProRes Variant"
        value={variant}
        onChange={setVariant}
      >
        <Form.Dropdown.Item value="proxy" title="ProRes Proxy (lowest quality, smallest size)" />
        <Form.Dropdown.Item value="lt" title="ProRes LT (low quality)" />
        <Form.Dropdown.Item value="standard" title="ProRes 422 (standard quality)" />
        <Form.Dropdown.Item value="hq" title="ProRes 422 HQ (high quality)" />
        <Form.Dropdown.Item value="4444" title="ProRes 4444 (highest quality with alpha)" />
        <Form.Dropdown.Item value="4444xq" title="ProRes 4444 XQ (extreme quality)" />
      </Form.Dropdown>
    );
  }

  return (
    <>
      <Form.Dropdown
        id="encodingMode"
        title="Encoding Mode"
        value={encodingMode}
        onChange={setEncodingMode}
      >
        <Form.Dropdown.Item value="crf" title="CRF (Constant Rate Factor) - Quality-based" />
        <Form.Dropdown.Item value="vbr" title="VBR (Variable Bitrate) - Size-based" />
        <Form.Dropdown.Item value="vbr-2-pass" title="VBR 2-Pass - Best quality for target size" />
      </Form.Dropdown>

      {encodingMode === "crf" ? (
        <Form.Dropdown
          id="crf"
          title="CRF Value"
          value={crf}
          onChange={setCrf}
        >
          <Form.Description text="Lower values = better quality, larger files. 18-28 is typically used." />
          {Array.from({ length: 52 }, (_, i) => i).map((value) => (
            <Form.Dropdown.Item 
              key={value} 
              value={value.toString()} 
              title={`${value} ${value === 18 ? "(excellent)" : value === 23 ? "(good default)" : value === 28 ? "(acceptable)" : ""}`}
            />
          ))}
        </Form.Dropdown>
      ) : (
        <>
          <Form.Dropdown
            id="bitrate"
            title="Target Bitrate"
            value={bitrate}
            onChange={setBitrate}
          >
            {["500", "750", "1000", "1500", "2000", "3000", "4000", "5000", "8000", "10000", "15000", "20000", "25000", "30000", "40000", "50000"].map((rate) => (
              <Form.Dropdown.Item key={rate} value={rate} title={`${rate} kbps`} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="maxBitrate"
            title="Max Bitrate (optional)"
            value={maxBitrate}
            onChange={setMaxBitrate}
          >
            <Form.Dropdown.Item value="" title="None" />
            {["750", "1000", "1500", "2000", "3000", "4000", "5000", "8000", "10000", "15000", "20000", "25000", "30000", "40000", "50000"].map((rate) => (
              <Form.Dropdown.Item key={rate} value={rate} title={`${rate} kbps`} />
            ))}
          </Form.Dropdown>
        </>
      )}

      {(outputFormat === ".mp4" || outputFormat === ".mkv") && (
        <Form.Dropdown
          id="preset"
          title="Encoding Preset"
          value={preset}
          onChange={setPreset}
        >
          <Form.Dropdown.Item value="ultrafast" title="Ultrafast (fastest encoding, largest files)" />
          <Form.Dropdown.Item value="superfast" title="Superfast" />
          <Form.Dropdown.Item value="veryfast" title="Very Fast" />
          <Form.Dropdown.Item value="faster" title="Faster" />
          <Form.Dropdown.Item value="fast" title="Fast" />
          <Form.Dropdown.Item value="medium" title="Medium (recommended balance)" />
          <Form.Dropdown.Item value="slow" title="Slow (better compression)" />
          <Form.Dropdown.Item value="slower" title="Slower" />
          <Form.Dropdown.Item value="veryslow" title="Very Slow (best compression)" />
        </Form.Dropdown>
      )}

      {outputFormat === ".webm" && (
        <Form.Dropdown
          id="quality"
          title="Quality Mode"
          value={quality}
          onChange={setQuality}
        >
          <Form.Dropdown.Item value="good" title="Good (recommended)" />
          <Form.Dropdown.Item value="best" title="Best (slower encoding)" />
          <Form.Dropdown.Item value="realtime" title="Realtime (fastest encoding)" />
        </Form.Dropdown>
      )}
    </>
  );
}
