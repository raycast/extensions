import { describe, expect, test } from "@jest/globals";
import { parsePresetOutput } from "./presetParser";

describe("PresetsParser", () => {
  test("parsed output includes the expected presets under the correct categories", () => {
    const result = parsePresetOutput(sampleInput);

    const expectedSamples = [
      { category: "General", presets: ["Very Fast 1080p30", "Fast 720p30"] },
      { category: "Web", presets: ["Creator 1080p60"] },
      { category: "Devices", presets: ["Apple 1080p60 Surround"] },
      { category: "CLI Defaults", presets: ["CLI Default"] },
    ];

    for (const expected of expectedSamples) {
      const match = result.find((r) => r.category === expected.category);
      if (!match) {
        throw new Error(`Category "${expected.category}" not found in parsed output.`);
      }

      expect(match).toBeDefined();
      expect(match!.presets).toEqual(expect.arrayContaining(expected.presets));
    }
  });

  const sampleInput = `
[20:45:12] Compile-time hardening features are enabled
[20:45:12] hb_init: starting libhb thread
[20:45:12] thread 16f2cb000 started ("libhb")
General/
    Very Fast 2160p60 4K AV1
        AV1 video (up to 2160p60) and AAC stereo audio, in an MP4
        container.
    Very Fast 2160p60 4K HEVC
        H.265 video (up to 2160p60) and AAC stereo audio, in an MP4
        container.
    Very Fast 1080p30
        Small H.264 video (up to 1080p30) and AAC stereo audio, in
        an MP4 container.
    Very Fast 720p30
        Small H.264 video (up to 720p30) and AAC stereo audio, in an
        MP4 container.
    Very Fast 576p25
        Small H.264 video (up to 576p25) and AAC stereo audio, in an
        MP4 container.
    Very Fast 480p30
        Small H.264 video (up to 480p30) and AAC stereo audio, in an
        MP4 container.
    Fast 2160p60 4K AV1
        AV1 video (up to 2160p60) and AAC stereo audio, in an MP4
        container.
    Fast 2160p60 4K HEVC
        H.265 video (up to 2160p60) and AAC stereo audio, in an MP4
        container.
    Fast 1080p30
        H.264 video (up to 1080p30) and AAC stereo audio, in an MP4
        container.
    Fast 720p30
        H.264 video (up to 720p30) and AAC stereo audio, in an MP4
        container.
    Fast 576p25
        H.264 video (up to 576p25) and AAC stereo audio, in an MP4
        container.
    Fast 480p30
        H.264 video (up to 480p30) and AAC stereo audio, in an MP4
        container.
    HQ 2160p60 4K AV1 Surround
        High quality AV1 video (up to 2160p60), AAC stereo audio,
        and Dolby Digital (AC-3) surround audio, in an MP4
        container.
    HQ 2160p60 4K HEVC Surround
        High quality H.265 video (up to 2160p60), AAC stereo audio,
        and Dolby Digital (AC-3) surround audio, in an MP4
        container.
    HQ 1080p30 Surround
        High quality H.264 video (up to 1080p30), AAC stereo audio,
        and Dolby Digital (AC-3) surround audio, in an MP4
        container.
    HQ 720p30 Surround
        High quality H.264 video (up to 720p30), AAC stereo audio,
        and Dolby Digital (AC-3) surround audio, in an MP4
        container.
    HQ 576p25 Surround
        High quality H.264 video (up to 576p25), AAC stereo audio,
        and Dolby Digital (AC-3) surround audio, in an MP4
        container.
    HQ 480p30 Surround
        High quality H.264 video (up to 480p30), AAC stereo audio,
        and Dolby Digital (AC-3) surround audio, in an MP4
        container.
    Super HQ 2160p60 4K AV1 Surround
        Super high quality AV1 video (up to 2160p60), AAC stereo
        audio, and Dolby Digital (AC-3) surround audio, in an MP4
        container.
    Super HQ 2160p60 4K HEVC Surround
        Super high quality H.265 video (up to 2160p60), AAC stereo
        audio, and Dolby Digital (AC-3) surround audio, in an MP4
        container.
    Super HQ 1080p30 Surround
        Super high quality H.264 video (up to 1080p30), AAC stereo
        audio, and Dolby Digital (AC-3) surround audio, in an MP4
        container.
    Super HQ 720p30 Surround
        Super high quality H.264 video (up to 720p30), AAC stereo
        audio, and Dolby Digital (AC-3) surround audio, in an MP4
        container.
    Super HQ 576p25 Surround
        Super high quality H.264 video (up to 576p25), AAC stereo
        audio, and Dolby Digital (AC-3) surround audio, in an MP4
        container.
    Super HQ 480p30 Surround
        Super high quality H.264 video (up to 480p30), AAC stereo
        audio, and Dolby Digital (AC-3) surround audio, in an MP4
        container.
Web/
    Creator 2160p60 4K
        High quality video for publishing via online services such
        as Vimeo and YouTube. H.264 video (up to 2160p60) and high
        bit rate AAC stereo audio in an MP4 container.
    Creator 1440p60 2.5K
        High quality video for publishing via online services such
        as Vimeo and YouTube. H.264 video (up to 1440p60) and high
        bit rate AAC stereo audio in an MP4 container.
    Creator 1080p60
        High quality video for publishing via online services such
        as Vimeo and YouTube. H.264 video (up to 1080p60) and high
        bit rate AAC stereo audio in an MP4 container.
    Creator 720p60
        High quality video for publishing via online services such
        as Vimeo and YouTube. H.264 video (up to 720p60) and high
        bit rate AAC stereo audio in an MP4 container.
    Social 25 MB 30 Seconds 1080p60
        Up to 30 seconds of video in 25 MB or less, for sharing via
        online social communities such as Discord and email services
        such as Gmail. H.264 video (up to 1080p60) and AAC stereo
        audio, in an MP4 container.
    Social 25 MB 1 Minute 720p60
        Up to 1 minute of video in 25 MB or less, for sharing via
        online social communities such as Discord and email services
        such as Gmail. H.264 video (up to 720p60) and AAC stereo
        audio, in an MP4 container.
    Social 25 MB 2 Minutes 540p60
        Up to 2 minutes of video in 25 MB or less, for sharing via
        online social communities such as Discord and email services
        such as Gmail. H.264 video (up to 540p60) and AAC stereo
        audio, in an MP4 container.
    Social 25 MB 5 Minutes 360p60
        Up to 5 minutes of video in 25 MB or less, for sharing via
        online social communities such as Discord and email services
        such as Gmail. H.264 video (up to 360p60) and AAC stereo
        audio, in an MP4 container.
Devices/
    Amazon Fire 2160p60 4K HEVC Surround
        H.265 video (up to 2160p60), AAC stereo audio, and Dolby
        Digital (AC-3) audio, in an MP4 container. Compatible with
        Amazon Fire TV 3rd Generation and later; Fire TV Stick 4K;
        Fire TV Cube.
    Amazon Fire 1080p30 Surround
        H.264 video (up to 1080p30), AAC stereo audio, and Dolby
        Digital (AC-3) audio, in an MP4 container. Compatible with
        Amazon Fire TV 1st Generation and later; Fire TV Stick 1st
        Generation and later; Fire HD 10 7th Generation (2017); Fire
        HDX 4th Generation (2014).
    Amazon Fire 720p30
        H.264 video (up to 720p30) and AAC stereo audio, in an MP4
        container. Compatible with Amazon Fire HD 4th Generation
        (2014) and later; Kindle Fire HDX 3rd Generation (2013);
        Kindle Fire HD 2nd Generation (2012) and later.
    Android 1080p30
        H.264 video (up to 1080p30) and AAC stereo audio, in an MP4
        container. Compatible with Android devices.
    Android 720p30
        H.264 video (up to 720p30) and AAC stereo audio, in an MP4
        container. Compatible with Android devices.
    Android 576p25
        H.264 video (up to 576p25) and AAC stereo audio, in an MP4
        container. Compatible with Android devices.
    Android 480p30
        H.264 video (up to 480p30) and AAC stereo audio, in an MP4
        container. Compatible with Android devices.
    Apple 2160p60 4K HEVC Surround
        H.265 video (up to 2160p60), AAC stereo audio, and Dolby
        Digital (AC-3) surround audio, in an MP4 container.
        Compatible with Apple iPhone 7 and later; Apple TV 4K.
    Apple 1080p60 Surround
        H.264 video (up to 1080p60), AAC stereo audio, and Dolby
        Digital (AC-3) surround audio, in an MP4 container.
        Compatible with Apple iPad 5th and 6th Generation; iPad mini
        2, 3, and 4; iPad Air 1st Generation and Air 2; iPad Pro
        1st, 2nd, and 3rd Generation; Apple TV 4th Generation and
        later.
    Apple 1080p30 Surround
        H.264 video (up to 1080p30), AAC stereo audio, and Dolby
        Digital (AC-3) surround audio, in an MP4 container.
        Compatible with Apple iPhone 5, 5s, SE, 6, 6 Plus, 6s, 6s
        Plus, and later; iPod touch 6th Generation; iPad 3rd, 4th
        Generation and later; iPad mini 1st Generation and later;
        Apple TV 3rd, 4th Generation and later.
    Apple 720p30 Surround
        H.264 video (up to 720p30), AAC stereo audio, and Dolby
        Digital (AC-3) surround audio, in an MP4 container.
        Compatible with Apple iPhone 4, 4S, and later; iPod touch
        4th, 5th Generation and later; iPad 1st Generation, iPad 2,
        and later; Apple TV 2nd Generation and later.
    Apple 540p30 Surround
        H.264 video (up to 540p30), AAC stereo audio, and Dolby
        Digital (AC-3) surround audio, in an MP4 container.
        Compatible with Apple iPhone 1st Generation, 3G, 3GS, and
        later; iPod touch 1st, 2nd, 3rd Generation and later; iPod
        Classic; Apple TV 1st Generation and later.
    Chromecast 2160p60 4K HEVC Surround
        H.265 video (up to 2160p60), AAC stereo audio, and Dolby
        Digital (AC-3) surround audio, in an MP4 container.
        Compatible with Google Chromecast Ultra.
    Chromecast 1080p60 Surround
        H.264 video (up to 1080p60), AAC stereo audio, and Dolby
        Digital (AC-3) surround audio, in an MP4 container.
        Compatible with Google Chromecast 3rd Generation.
    Chromecast 1080p30 Surround
        H.264 video (up to 1080p30), AAC stereo audio, and Dolby
        Digital (AC-3) surround audio, in an MP4 container.
        Compatible with Google Chromecast 1st, 2nd Generation and
        later.
    Playstation 2160p60 4K Surround
        H.264 video (up to 2160p60), AAC stereo audio, and Dolby
        Digital (AC-3) surround audio, in an MP4 container.
        Compatible with Playstation 4 Pro.
    Playstation 1080p30 Surround
        H.264 video (up to 1080p30), AAC stereo audio, and Dolby
        Digital (AC-3) surround audio, in an MP4 container.
        Compatible with Playstation 3 and 4.
    Playstation 720p30
        H.264 video (up to 720p30) and AAC stereo audio, in an MP4
        container. Compatible with Playstation Vita TV.
    Playstation 540p30
        H.264 video (up to 540p30) and AAC stereo audio, in an MP4
        container. Compatible with Playstation Vita.
    Roku 2160p60 4K HEVC Surround
        H.265 video (up to 2160p60), AAC stereo audio, and surround
        audio, in an MKV container. Compatible with Roku 4,
        Streaming Stick+, Premiere+, and Ultra.
    Roku 1080p30 Surround
        H.264 video (up to 1080p30), AAC stereo audio, and Dolby
        Digital (AC-3) surround audio, in an MP4 container.
        Compatible with Roku 1080p models.
    Roku 720p30 Surround
        H.264 video (up to 720p30), AAC stereo audio, and Dolby
        Digital (AC-3) surround audio, in an MP4 container.
        Compatible with Roku 720p models.
    Roku 576p25
        H.264 video (up to 576p25) and AAC stereo audio, in an MP4
        container. Compatible with Roku standard definition models.
    Roku 480p30
        H.264 video (up to 480p30) and AAC stereo audio, in an MP4
        container. Compatible with Roku standard definition models.
    Xbox 1080p30 Surround
        H.264 video (up to 1080p30), AAC stereo audio, and Dolby
        Digital (AC-3) surround audio, in an MP4 container.
        Compatible with Xbox One.
Matroska/
    AV1 MKV 2160p60 4K
        AV1 video (up to 2160p60) and Opus stereo audio, in an MKV
        container.
    H.265 MKV 2160p60 4K
        H.265 video (up to 2160p60) and AAC stereo audio, in an MKV
        container.
    H.265 MKV 1080p30
        H.265 video (up to 1080p30) and AAC stereo audio, in an MKV
        container.
    H.265 MKV 720p30
        H.265 video (up to 720p30) and AAC stereo audio, in an MKV
        container.
    H.265 MKV 576p25
        H.265 video (up to 576p25) and AAC stereo audio, in an MKV
        container.
    H.265 MKV 480p30
        H.265 video (up to 480p30) and AAC stereo audio, in an MKV
        container.
    H.264 MKV 2160p60 4K
        H.264 video (up to 2160p60) and AAC stereo audio, in an MKV
        container.
    H.264 MKV 1080p30
        H.264 video (up to 1080p30) and AAC stereo audio, in an MKV
        container.
    H.264 MKV 720p30
        H.264 video (up to 720p30) and AAC stereo audio, in an MKV
        container.
    H.264 MKV 576p25
        H.264 video (up to 576p25) and AAC stereo audio, in an MKV
        container.
    H.264 MKV 480p30
        H.264 video (up to 480p30) and AAC stereo audio, in an MKV
        container.
    VP9 MKV 2160p60 4K
        VP9 video (up to 2160p60) and Opus stereo audio, in an MKV
        container.
    VP9 MKV 1080p30
        VP9 video (up to 1080p30) and Opus stereo audio, in an MKV
        container.
    VP9 MKV 720p30
        VP9 video (up to 720p30) and Opus stereo audio, in an MKV
        container.
    VP9 MKV 576p25
        VP9 video (up to 576p25) and Opus stereo audio, in an MKV
        container.
    VP9 MKV 480p30
        VP9 video (up to 480p30) and Opus stereo audio, in an MKV
        container.
Hardware/
    AV1 QSV 2160p 4K
        Intel Quick Sync Video hardware accelerated AV1 video (up to
        2160p) and AAC stereo audio, in an MP4 container.
    H.265 NVENC 2160p 4K
        Nvidia NVENC hardware accelerated H.265 video (up to 2160p)
        and AAC stereo audio, in an MP4 container.
    H.265 NVENC 1080p
        Nvidia NVENC hardware accelerated H.265 video (up to 1080p)
        and AAC stereo audio, in an MP4 container.
    H.265 QSV 2160p 4K
        Intel Quick Sync Video hardware accelerated H.265 video (up
        to 2160p) and AAC stereo audio, in an MP4 container.
    H.265 QSV 1080p
        Intel Quick Sync Video hardware accelerated H.265 video (up
        to 1080p) and AAC stereo audio, in an MP4 container.
    H.265 VCN 2160p 4K
        AMD VCN hardware accelerated H.265 video (up to 2160p) and
        AAC stereo audio, in an MP4 container.
    H.265 VCN 1080p
        AMD VCN hardware accelerated H.265 video (up to 1080p) and
        AAC stereo audio, in an MP4 container.
    H.265 MF 2160p 4K
        Hardware accelerated H.265 video (up to 2160p) and AAC
        stereo audio, in an MP4 container for ARM based platforms
        using Media Foundation
    H.265 MF 1080p
        Hardware accelerated H.265 video (up to 1080p) and AAC
        stereo audio, in an MP4 container for ARM based platforms
        using Media Foundation
    H.265 Apple VideoToolbox 2160p 4K
        Apple VideoToolbox hardware accelerated H.265 video (up to
        2160p) and AAC stereo audio, in an MP4 container.
    H.265 Apple VideoToolbox 1080p
        Apple VideoToolbox hardware accelerated H.265 video (up to
        1080p) and AAC stereo audio, in an MP4 container.
Professional/
    Production Max
        Maximum bit rate, constant frame rate H.264 video and high
        bit rate AAC stereo audio in an MP4 container. For
        professional use as an intermediate format for video
        editing. Creates gigantic files.
    Production Standard
        High bit rate, constant frame rate H.264 video and high bit
        rate AAC stereo audio in an MP4 container. For professional
        use as an intermediate format for video editing. Creates
        very large files.
    Production Proxy 1080p
        Intra-only, constant frame rate H.264 video (up to 1080p)
        and high bit rate AAC stereo audio in an MP4 container. For
        professional use as a low resolution proxy format for video
        editing.
    Production Proxy 540p
        Intra-only, constant frame rate H.264 video (up to 540p) and
        high bit rate AAC stereo audio in an MP4 container. For
        professional use as a low resolution proxy format for video
        editing.
    Preservation FFV1
        Lossless FFV1 video and original audio with FLAC fallback in
        an MKV container. For professional use as an archival format
        for digital preservation. Creates extremely large files.
CLI Defaults/
    CLI Default

HandBrake has exited.
`;
});
