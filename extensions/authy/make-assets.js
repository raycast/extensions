#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-var-requires */
const { Transform: transform } = require("stream");
const sharp = require("sharp");
const { Buffer } = require("buffer");
const { genericColors, icondir, icons, logos } = require("./src/constants.js");
const glob = require("fast-glob");
const { createReadStream, createWriteStream, mkdir } = require("fs");
const { basename, dirname, extname, resolve } = require("path");
const { promisify } = require("util");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const mkdirProm = promisify(mkdir);

const resizeOptions = (size) => ({
  width: size,
  height: size,
  fit: sharp.fit.contain,
  background: { r: 255, g: 255, b: 255, alpha: 0 },
});

const size = 32;
const width = 6;
const circleSize = size - width;
const circum = Math.PI * circleSize;

async function getWriteStream(filename) {
  await mkdirProm(resolve(dirname(filename)), { recursive: true });
  return createWriteStream(filename);
}

const fullBg = (radius, color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${color || "#CCC"}"/>
</svg>`;

const noBg = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"></svg>`;

const pie = (percent, color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <circle r="${circleSize / 2}" cx="${size / 2}" cy="${size / 2}" fill="transparent"
          stroke="${color || "#CCC"}"
          stroke-width="${width}"
          stroke-dasharray="${percent * circum} ${circum}"
          transform="rotate(-${90 + 360 * percent} ${size / 2} ${size / 2})" />
</svg>`;

function replace(from, to) {
  const stream = new transform({ objectMode: true });
  stream._transform = (chunk, encoding, callback) => {
    callback(null, Buffer.from(chunk.toString().replaceAll(from, to)));
  };
  return stream;
}

function transformSvg2Png(colorName, color, circle = false, addBg = false, offset = 0) {
  const stream = new transform({ objectMode: true });
  stream._transform = async function (file, encoding, cb) {
    // Pass through if null
    if (file === null) {
      return cb(null, file);
    }

    const radius = size / (circle ? 2 : 5);
    const calcOff = addBg ? (circle ? 6 : 2) : offset;

    const bg = Buffer.from(addBg ? fullBg(radius, color) : noBg());
    cb(
      null,
      await sharp(bg)
        .composite([
          {
            input: await sharp(file)
              .resize(resizeOptions(size - calcOff * 2))
              .toBuffer(),
            left: calcOff,
            top: calcOff,
          },
        ])
        .png({ palette: true, colors: 5, adaptiveFiltering: true })
        .toBuffer()
    );
  };
  return stream;
}

function bufferPieSvg2Png(colorName, color, percent) {
  const bg = Buffer.from(pie(percent, color));
  return sharp(bg).png({ palette: true, colors: 5, adaptiveFiltering: true }).toBuffer();
}

const modeColors = [
  { name: "light", value: "#333" },
  { name: "dark", value: "#CCC" },
];

async function makeBrandedIcons() {
  const tools = await (await fetch("https://api.authy.com/assets/chrome/high")).json();
  const results = [];
  for (const color of modeColors) {
    for (const file of await glob(
      `node_modules/simple-icons/icons/{${[...logos, ...Object.keys(tools.urls)].join(",")}}.svg`
    )) {
      const ext = extname(file);
      const name = basename(file).replace(ext, "").replace("amazonaws", "aws");
      results.push(name);
      const out = await getWriteStream(`./assets/${icondir}/${color.name}/brand/${name}.png`);
      createReadStream(file)
        .pipe(replace("path ", `path fill="${color.value}" `))
        .pipe(transformSvg2Png())
        .pipe(out);
    }
  }
  console.log(
    "missing",
    Object.keys(tools.urls).filter((logo) => !results.includes(logo))
  );
  console.log("available", results);
}

async function makeColoredIcons(color) {
  for (const icon of icons) {
    for (const file of await glob(`node_modules/@primer/octicons/build/svg/${icon}-24.svg`)) {
      const out = await getWriteStream(`./assets/${icondir}/${icon.replace("key", "authenticator")}_${color.name}.png`);
      createReadStream(file)
        .pipe(replace("path ", `path fill="${color.value}" `))
        .pipe(transformSvg2Png(color.name, undefined, false, false, 1))
        .pipe(out);
    }
  }
}

function coloredIcons() {
  for (const color of genericColors) {
    makeColoredIcons(color);
  }
}

async function makePicons() {
  for (let i = 1; i <= 30; i++) {
    for (const color of modeColors) {
      const out = await getWriteStream(`./assets/${icondir}/${color.name}/pie-${i}.png`);
      out.write(await bufferPieSvg2Png(color.name, color.value, i / 30));
    }
  }
}

async function doWork() {
  coloredIcons();
  makeBrandedIcons();
  makePicons();
}

doWork();
