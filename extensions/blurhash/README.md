<p align="center">
  <img src="extension-icon.png" width="128" height="128" alt="BlurHash Generator" />
</p>

<h1 align="center">BlurHash Generator</h1>

<p align="center">Raycast extension to generate blurhash strings from images and videos.</p>

---

Copy a file in Finder or an image from anywhere, run the command, get the hash. That's it.

**Output** is a single copyable line:

```
filename.jpg 1920x1080 16:9 LKO2?U%2Tw=w]~RBVZRi...
```

## Install

```
git clone https://github.com/freaktion-craft/blurhash-raycast.git
cd blurhash-raycast
npm install && npm run dev
```

Requires [ffmpeg](https://formulae.brew.sh/formula/ffmpeg): `brew install ffmpeg`

## License

MIT
