# Image Modification

Rotate, flip, scale, resize, convert, and apply filters to selected images.

## Features

- Convert between many different image formats, including WebP and SVG
    - WebP conversion supported by [cwebp and dwebp](https://developers.google.com/speed/webp/docs/precompiled)
    - SVG conversion supported by [Potrace](https://potrace.sourceforge.net)
- Rotate, flip, scale, resize, and pad images by applying SIPS commands
- Apply filters and distortions such as Bokeh Blur, Noir, X-Ray, and more
- Rotate and flip the pages of PDFs
- Optimize images using JPEG compression, [svgo](https://github.com/svg/svgo), and other strategies

## Commands

- Apply Image Filter
    - Apply various filters to the provided images using Apple's CIFilters
- Convert Images
    - Convert selected images from their current format to another.
- Flip Images Horizontally
    - Flip selected images horizontally.
- Flip Images Vertically
    - Flip selected images vertically.
- Optimize Images [Amount]
    - Decrease image file size by reducing complexity.
- Pad Images [Amount] [Color]
    - Pad images by the specified number of pixels using the provided color (defaults to white).
- Resize Images [Width] [Height]
    - Resize images proportionally by specifying either width or height.
    - Resize images precisely by specifying both parameters.
- Rotate Images [Degrees]
    - Rotate images clockwise by the specified amount.
- Scale Images [Scale Factor]
    - Scale images proportionally by the specified factor.