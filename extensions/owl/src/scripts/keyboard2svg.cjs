/* ========================================================================
 * international-keyboards - v0.12.0
 * ========================================================================
 * Copyright 2022 Pol van Rijn
 *
 * ========================================================================
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://opensource.org/licenses/MIT
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================================
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const puppeteer = require("puppeteer");
const fs = require("node:fs");
const { keyboardToOptions } = require("./defaultKeyboardOptions.js");
const { merge } = require("lodash");
const AVAILABLE_KEYS = [
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
  "Digit7",
  "Digit8",
  "Digit9",
  "Digit0",
  "Minus",
  "Equal",
  "KeyQ",
  "KeyW",
  "KeyE",
  "KeyR",
  "KeyT",
  "KeyY",
  "KeyU",
  "KeyI",
  "KeyO",
  "KeyP",
  "BracketLeft",
  "BracketRight",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyF",
  "KeyG",
  "KeyH",
  "KeyJ",
  "KeyK",
  "KeyL",
  "Semicolon",
  "Quote",
  "Backquote",
  "Backslash",
  "KeyZ",
  "KeyX",
  "KeyC",
  "KeyV",
  "KeyB",
  "KeyN",
  "KeyM",
  "Comma",
  "Period",
  "Slash",
];

class Keyboard {
  constructor(options) {
    this._options = merge(
      {
        keyboardID: undefined,
        containerID: "keyboard",
        keyboardType: "ANSI",
        addLatinKeys: false,
        showKeys: AVAILABLE_KEYS,
        keyVariant: "lower",
        cssStyle: "inverted",
      },
      options,
    );
  }

  async initializeKeyboard() {
    const svgBuffer = fs.readFileSync(`assets/keyboards/${this._options.keyboardType}.svg`, "utf-8");
    const keyData = JSON.parse(fs.readFileSync(`assets/keyboards/json/${this._options.keyboardID}.json`, "utf-8"));

    const browser = await puppeteer.launch({
      headless: true,
    });
    const page = await browser.newPage();

    // Load SVG and inject script for labeling
    await page.setContent(`<html><body>${svgBuffer}</body></html>`, { waitUntil: "domcontentloaded" });

    await page.addScriptTag({
      content: `
      window.insertLabels = function(keyData, options) {
        const AVAILABLE_KEYS = ${JSON.stringify(AVAILABLE_KEYS)};
        const showKeys = options.showKeys;
        const addLatinKeys = options.addLatinKeys;
        const cssStyle = options.cssStyle;
        const keyVariant = options.keyVariant;

        document.querySelectorAll("svg path").forEach((path) => {
          path.setAttribute("class", "key " + cssStyle);
        });

        Object.entries(keyData).forEach(([key, values]) => {
          const path = document.getElementById(key);
          if (!path || !showKeys.includes(key)) return;

          const bbox = path.getBBox();
          path.classList.add("active-key", cssStyle);

          const keyElement = path.parentElement;
          const attributes = 'text-anchor="middle" alignment-baseline="middle"';
          let x, y, classes;
          let keyText = values[keyVariant];
          let showLatinKey = false;
          let latinKey;

          if (addLatinKeys) {
            if (key.startsWith("Key") || key.startsWith("Digit")) {
              latinKey = key.replace("Key", "").replace("Digit", "");
              if (latinKey.toUpperCase() !== keyText.toUpperCase()) {
                showLatinKey = true;
              }
            }
          } else {
            if (key.includes("Key")) {
              keyText = keyText.toUpperCase();
            }
          }

          if (showLatinKey) {
            classes = "keyLabel small " + cssStyle + " label-" + key;
            x = bbox.x + bbox.width / 4;
            y = bbox.y + bbox.height / 4 + 8;
            const t1 = document.createElementNS("http://www.w3.org/2000/svg", "text");
            t1.setAttribute("x", x);
            t1.setAttribute("y", y);
            t1.setAttribute("class", classes);
            t1.setAttribute("text-anchor", "middle");
            t1.setAttribute("alignment-baseline", "middle");
            t1.textContent = latinKey;
            keyElement.appendChild(t1);

            x = bbox.x + (3 * bbox.width) / 4 - 10;
            y = bbox.y + (3 * bbox.height) / 4 - 2;
            const t2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
            t2.setAttribute("x", x);
            t2.setAttribute("y", y);
            t2.setAttribute("class", classes);
            t2.setAttribute("text-anchor", "middle");
            t2.setAttribute("alignment-baseline", "middle");
            t2.textContent = keyText;
            keyElement.appendChild(t2);
          } else {
            classes = "keyLabel " + cssStyle + " label-" + key;
            x = bbox.x + bbox.width / 2;
            y = bbox.y + bbox.height / 2 + 6;
            const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
            t.setAttribute("x", x);
            t.setAttribute("y", y);
            t.setAttribute("class", classes);
            t.setAttribute("text-anchor", "middle");
            t.setAttribute("alignment-baseline", "middle");
            t.textContent = keyText;
            keyElement.appendChild(t);
          }
        });
      }
    `,
    });

    await page.evaluate(
      (keyData, options) => {
        // eslint-disable-next-line no-undef
        const style = document.createElement("style");
        style.textContent = `
    .icon {
    width: 15px;

}

.keyLabel {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
    font-size: 70px;
    font-weight: 500;
    fill: #fff;
}

.keyLabel.small {
    font-size: 50px;
}

.key {
    stroke: #000;
    stroke-width: 6px;
    fill: #000;
}

/*   Default style black an white */
.key.highlight {
    stroke: #ffc600;
    fill: #ffffff;
}

.keyLabel.highlight {
    fill: #ffc600;
}

.key.press {
    stroke: #000;
    fill: #ffffff;
}

.keyLabel.press {
    fill: #000;
}


/* Inverted style */
.inverted.key {
    stroke: #000;
    fill: #fff;
}

.inverted.keyLabel {
    fill: #000;
}


.inverted.key.highlight {
    stroke: #000;
    fill: #ffc600;
}

.inverted.key.press {
    stroke: #000;
    fill: #000;
}

.inverted.keyLabel.press {
    fill: #fff;
}


/*!*   Apple style *!*/
.apple.keyLabel {
    fill: #576FA5
}

.apple.key {
    stroke: #F0F3F7;
    fill: #F0F3F7;

}

.apple.active-key {
    stroke: #E4EAF2;
    fill: #E4EAF2;
}

.apple.key.highlight {
    stroke: #576FA5;
    fill: #fff;
    stroke-dasharray: 8 8;
}

.apple.key.press {
    stroke: #576FA5;
    fill: #576FA5;
}

.apple.keyLabel.press {
    fill: #fff;
}`;
        // eslint-disable-next-line no-undef
        document.querySelector("svg").prepend(style);
        // eslint-disable-next-line no-undef
        window.insertLabels(keyData, options);
      },
      keyData,
      this._options,
    );

    this.page = page;
    this.browser = browser;
  }

  async svg() {
    if (!this.page) {
      await this.initializeKeyboard();
    }

    const svgContent = await this.page.$eval("svg", (el) => el.outerHTML);
    return svgContent;
  }

  async png(outputPath) {
    if (!this.page) {
      await this.initializeKeyboard();
    }

    const svgElement = await this.page.$("svg");
    const boundingBox = await svgElement.boundingBox();

    await this.page.setViewport({
      width: Math.ceil(boundingBox.width),
      height: Math.ceil(boundingBox.height),
    });

    await svgElement.screenshot({ path: outputPath, omitBackground: true });
    await this.browser.close();
  }
}

(async () => {
  for (const [key, options] of Object.entries(keyboardToOptions)) {
    const keyboard = new Keyboard(options);
    await keyboard.png(`assets/keyboards/png/${key}.png`);

    console.log(`Saved PNG for ${key} keyboard.`);
  }
})();
