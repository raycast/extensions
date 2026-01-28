# ImageFlow

Process images using workflow.

## Description

Imageflow is a Raycast extension for processing images with custom pipelines, you can organize operations such as resizing, uploading, and compressing into a pipeline to process images in your own way.

> This extension still in development and does not submit to Raycast Extension yet, you can clone this repo and install it locally.

## Support Actions

- [x] 🌰 Resize And Compress Image by [sharp](https://sharp.pixelplumbing.com/)
- [x] 🐝 Convert Image Format by [sharp](https://sharp.pixelplumbing.com/)
- [x] 📦 Overwrite Original images
- [x] 🚀 Upload Image To S3
- [x] 🌈 Upload Image To Cloudflare R2 Storage
- [x] 🍮 Copy Image To Clipboard
- [x] 🐼 Convert Image To Markdown format
- [x] 🍉 Rename Image with uuid or date or something else
- [x] 🍅 Customize any workflow—choose whatever you want

## Demo

https://github.com/user-attachments/assets/9b22bc67-1138-4c01-8ecc-0f7c59bb3542

> [!NOTE]  
> You can quickly get the sample configuration file by running the following command in your terminal.

```
curl https://raw.githubusercontent.com/godruoyi/imageflow/master/workflow.yaml | tee ~/workflow.yaml
```

#### Sample configuration file `workflow.yaml`:

```yaml

```

## Actions

| Action     | Description                                 | Input           | Output          | Params                                                                                                                               |
|------------|---------------------------------------------|-----------------|-----------------|--------------------------------------------------------------------------------------------------------------------------------------|
| resize     | Resize and compress image via sharp         | filepath or url | filepath        | width: number<br/>height: number<br/>type: string<br/>See [request option](https://tinypng.com/developers/reference#request-options) |
| compress   | Compress image via sharp (only compress)    | filepath or url | filepath or url | output_type?: file or url                                                                                                            |
| convert    | Convert image format via sharp              | filepath or url | filepath        | format: string, available formats: jpeg, png, webp, avif                                                                             |
| overwrite  | Overwrite original images                   | filepath        | filepath        | -                                                                                                                                    |
| upload     | Upload image to S3 or Cloudflare R2 Storage | filepath        | url             | bucket: string<br/>root?: string<br/>cdn?: string                                                                                    |
| clipboard  | Copy image to clipboard                     | filepath or url | Input           | -                                                                                                                                    |
| tomarkdown | Convert image to markdown format            | filepath or url | markdown        | -                                                                                                                                    |
| rename     | Rename image with uuid or date or something | filepath        | filepath        | to: string<br/>available variable name "{uuid}", "{timestamp}", "{yyyy}", "{yyyy_mm}", "{yyyy_mm_dd}"                                |

## Install From Raycast Store

coming soon...

## Install From Source & Development

Clone this repo and install it locally in developer mode.

You will need to have [Node.js](https://nodejs.org) and npm installed.

1. Clone this repo `git clone https://github.com/godruoyi/imageflow.git`
2. Go to the folder `cd imageflow`
3. Install dependencies `npm install && npm run build`
4. Go to Raycast, run `Import Extension` and select the folder


## Need Help?

- [ ] Introduction of sharp to process images locally 🤔
- [ ] OpenDAL 🤔
- [ ] Support more image processing actions like:
  - [ ] Watermark 🤔
  - [ ] Move to folder
  - [ ] Upload to other cloud storage like Google Cloud Storage, Aliyun OSS, etc. But it's better to use OpenDAL to support if possible.

## License

MIT License
