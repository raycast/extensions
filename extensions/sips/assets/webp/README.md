# WebP Codec

```
      __   __  ____  ____  ____
     /  \\/  \/  _ \/  _ )/  _ \
     \       /   __/  _  \   __/
      \__\__/\____/\_____/__/ ____  ___
            / _/ /    \    \ /  _ \/ _/
           /  \_/   / /   \ \   __/  \__
           \____/____/\_____/_____/____/v1.3.0
```

WebP codec is a library to encode and decode images in WebP format. This package
contains the library that can be used in other programs to add WebP support, as
well as the command line tools 'cwebp' and 'dwebp' to compress and decompress
images respectively.

See https://developers.google.com/speed/webp for details on the image format.

The latest source tree is available at
https://chromium.googlesource.com/webm/libwebp

It is released under the same license as the WebM project. See
https://www.webmproject.org/license/software/ or the "COPYING" file for details.
An additional intellectual property rights grant can be found in the file
PATENTS.

## Files

*   bin/cwebp : encoding tool
*   bin/dwebp : decoding tool
*   bin/gif2webp : gif conversion tool
*   bin/img2webp : animation creation tool
*   bin/vwebp : webp visualization tool
*   bin/webpinfo : webp analysis tool
*   bin/webpmux : webp muxing tool
*   bin/anim\_diff : webp file comparison tool
*   bin/anim\_dump : tool for dumping animation frames
*   bin/get\_disto : tool for calculating file distortion
*   bin/webp\_quality : webp quality estimation tool
*   doc/ : manual in HTML and text formats
*   lib/ : static libraries
*   include/webp : headers

## Encoding and Decoding Tools

The bin/ directory contains tools to encode and decode images and animations,
view information about WebP images, and more. See the
[tools documentation](doc/tools.md).

## APIs

See the [APIs documentation](doc/api.md).

## Bugs

Please report all bugs to the issue tracker: https://bugs.chromium.org/p/webp

Patches welcome! See [how to contribute](CONTRIBUTING.md).

## Discuss

Email: webp-discuss@webmproject.org

Web: https://groups.google.com/a/webmproject.org/group/webp-discuss
