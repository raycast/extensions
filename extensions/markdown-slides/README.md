# Markdown Slides

Create and Preview markdown presentations in the [marp-format](https://marpit.marp.app/?id=how-to-use).

You can export an HTML-Version of your presentation by running the "Open in Browser" action when previewing a file. Use the browser's print dialog to generate a PDF.

## Configuration

The directory for slides is at `~/slides` by default, but it can be changed in the extension settings.

Pages are separated by horizontal ruler (`---`) to enable compatibility with Marp by default, but it is possible set it to multiple newline characters instead.

## Images

Include local images in your markdown, includes the image files in your slides directory or an `images` folder within it. Then you can link to them with the following syntax: 

```md
![](/Users/USERNAME/slides/images/Image.png)
```

It is possible to [adjust the display size within Raycast](https://developers.raycast.com/api-reference/user-interface/detail#detail) using the `?raycast-height=200` or `?raycast-width=200` parameters within the link.

In Marp, there is a [different syntax](https://marpit.marp.app/image-syntax), which is applied to the link text: `![width:200px](image.jpg)`, so both styling solutions can be used together.


## Themes 

Available [themes](https://github.com/marp-team/marp-core/blob/main/themes/README.md):
- default
- gaia
- uncover

Original Credits: https://gist.github.com/MarcoIeni/d89c79704a9bb62b004b0f0d0a9b9bc6
