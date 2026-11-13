import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Editable source for the bundled illustrations. No image downloads or runtime generation.
const output = new URL("../assets/animated/", import.meta.url);
mkdirSync(output, { recursive: true });
const ink = "#292321";
const white = "#fffdf7";
const blush = "#f5b5bd";

function rotate(pivot, values, times = "0;0.3;0.4;0.5;0.6;0.7;1", duration = "4.8s") {
  return `<animateTransform attributeName="transform" type="rotate" values="${values.map((angle) => `${angle} ${pivot}`).join(";")}" keyTimes="${times}" dur="${duration}" repeatCount="indefinite"/>`;
}

function blink(eyes, y = 132, duration = "5.2s") {
  return `<g transform="translate(0 ${y})"><g data-part="eyes">
    <animateTransform attributeName="transform" type="scale" values="1 1;1 1;1 0.08;1 1;1 1;1 0.08;1 1;1 1" keyTimes="0;0.54;0.56;0.58;0.64;0.66;0.68;1" dur="${duration}" repeatCount="indefinite"/>
    ${eyes}
  </g></g>`;
}

// Eye styles follow the portraits: shiny (highlight + lower glint), lidded (half-closed), closed (happy arcs).
function eyes({ style = "shiny", y = 132, duration } = {}) {
  const pair = [102, 158]
    .map((x) => {
      if (style === "closed") return `<path d="M${x - 9} 2q9 -5 18 0" fill="none" stroke-width="3.5"/>`;
      if (style === "lidded")
        return `<ellipse cx="${x}" cy="0" rx="11" ry="7.5" fill="${ink}" stroke="none"/><path d="M${x - 7} 0.5q7 5 14 0q-7 -2.5 -14 0Z" fill="white" stroke="none"/>`;
      return `<ellipse cx="${x}" cy="0" rx="8.5" ry="9" fill="${ink}" stroke="none"/><circle cx="${x - 1.5}" cy="-3.5" r="2.6" fill="white" stroke="none"/><path d="M${x - 4} 3.5q4 2.5 8 0" fill="none" stroke="white" stroke-width="1.8"/>`;
    })
    .join("");
  return blink(pair, y, duration);
}

function cheeks(y = 150) {
  return `<g stroke="none" fill="${blush}"><ellipse cx="83" cy="${y}" rx="14" ry="9"/><ellipse cx="177" cy="${y}" rx="14" ry="9"/></g>
    <path d="${[83, 177].flatMap((x) => [-9, -3, 3, 9].map((dx) => `M${x + dx + 1.5} ${y - 3}l-3 6`)).join("")}" fill="none" stroke-width="2"/>`;
}

function mouth(open = false) {
  return `<g data-part="mouth" transform="translate(130 151)">
    <g><animateTransform attributeName="transform" type="scale" values="1 1;1 1;1 1.2;1 1;1 1" keyTimes="0;0.3;0.45;0.6;1" dur="4.8s" repeatCount="indefinite"/>
      ${open ? `<path d="M-9 4Q0 32 9 4Z" fill="${ink}"/><path d="M-5 12Q0 8 5 12L3 17Q0 20 -3 17Z" fill="${blush}" stroke="none"/>` : ""}
      <path d="M-11 0q2 9 11 3q9 6 11 -3${open ? "M0 -3v5" : ""}" fill="none" stroke-width="3.4"/>
      <path d="${open ? "M-4 25q4 2 8 0" : "M-4 13q4 2 8 0"}" fill="none" stroke-width="3"/>
    </g>
  </g>`;
}

function feet(fill) {
  return `<g fill="${fill}"><path d="M102 225q-17 11 -12 18q5 8 23 0l3 -16"/><path d="M144 227l3 16q18 8 23 0q5 -7 -12 -18"/></g>`;
}

function torso(fill) {
  return `<path d="M95 171Q79 191 88 219Q93 237 130 239Q167 237 172 219Q181 191 165 171Z" fill="${fill}"/>`;
}

function paw({ fill = white, side = "right", wave = true } = {}) {
  const left = side === "left";
  return `<g data-part="${side}-arm">
    ${wave ? rotate(left ? "92 185" : "168 185", left ? [0, 0, 24, -8, 24, 0, 0] : [0, 0, -28, 8, -28, 0, 0]) : ""}
    <path d="${left ? "M96 178Q86 175 78 186L65 198Q61 204 67 208Q73 211 79 204L99 192" : "M164 178Q174 175 182 186L195 198Q199 204 193 208Q187 211 181 204L161 192"}" fill="${fill}"/>
  </g>`;
}

function roundEars(fill = white, inner, small = false) {
  return [false, true]
    .map((right) => {
      const x = small ? (right ? 170 : 90) : right ? 185 : 75;
      if (small)
        return `<g data-part="${right ? "right" : "left"}-ear">${rotate(`${x} 90`, right ? [0, 0, 7, -3, 7, 0, 0] : [0, 0, -5, 3, -5, 0, 0], undefined, "6.4s")}
      <path d="M${x - 15} 94Q${x - 17} 66 ${x} 67Q${x + 17} 68 ${x + 15} 94" fill="${fill}"/></g>`;
      return `<g data-part="${right ? "right" : "left"}-ear">${rotate(`${x} 96`, right ? [0, 0, 7, -3, 7, 0, 0] : [0, 0, -5, 3, -5, 0, 0], undefined, "6.4s")}
      <path d="M${x - 14} 104C${x - 35} 71 ${x - 9} 49 ${x + 5} 65Q${x + 18} 75 ${x + 11} 102" fill="${fill}"/>
      ${inner ? `<ellipse cx="${x - 4}" cy="83" rx="9" ry="14" fill="${inner}" stroke="none"/>` : ""}</g>`;
    })
    .join("");
}

const roundHead = (fill = white) =>
  `<path d="M72 94C44 112 45 158 67 174C82 186 109 189 130 188C156 189 180 185 194 172C216 153 213 112 187 94C164 75 96 75 72 94Z" fill="${fill}"/>`;

function smallCharacter({
  fill = white,
  ears = "",
  head = roundHead(fill),
  back = "",
  markings = "",
  face = eyes() + cheeks() + mouth(),
  arms = paw({ fill, side: "left", wave: false }) + paw({ fill }),
  front = "",
}) {
  return `${back}${feet(fill)}${torso(fill)}${arms}${ears}${head}${markings}${face}${front}`;
}

const illustrations = {
  chiikawa: {
    label: "Chiikawa blinks and gives a shy wave",
    color: "#f7ced8",
    body: smallCharacter({
      ears: roundEars(white, undefined, true),
      markings: `<path d="M94 115q7 -5 13 -3 M153 112q7 -2 13 3" fill="none" stroke-width="3"/>`,
    }),
  },
  hachiware: {
    label: "Hachiware blinks, waves, and twitches their ears",
    color: "#c0e8f5",
    body: smallCharacter({
      ears: [false, true]
        .map(
          (right) =>
            `<g data-part="${right ? "right" : "left"}-ear">${rotate(right ? "180 98" : "80 98", right ? [0, 0, 8, -4, 8, 0, 0] : [0, 0, -8, 4, -8, 0, 0], undefined, "5.6s")}<path d="${right ? "M161 97L183 59Q187 52 192 62L207 111" : "M99 97L77 59Q73 52 68 62L53 111"}" fill="#9ac4d5"/></g>`,
        )
        .join(""),
      markings: `<path d="M53 111Q60 85 88 81Q108 75 130 79Q157 75 178 85Q199 93 207 111Q168 119 130 102Q92 119 53 111Z" fill="#9ac4d5" stroke-width="3"/>`,
      face:
        `<path d="M101 114l1 -1M157 113l1 1" fill="none" stroke-width="3"/>` +
        eyes({ duration: "5.6s" }) +
        cheeks() +
        mouth(true),
    }),
  },
  usagi: {
    label: "Usagi wiggles long ears, blinks, and waves both paws",
    color: "#f8e59f",
    body: smallCharacter({
      fill: "#fff0bc",
      ears: [false, true]
        .map(
          (
            right,
          ) => `<g data-part="${right ? "right" : "left"}-ear">${rotate(right ? "143 92" : "117 92", right ? [0, 0, 10, -8, 10, 0, 0] : [0, 0, -12, 7, -12, 0, 0], undefined, "3.6s")}
        <path d="${right ? "M132 92C131 60 133 22 144 22C156 22 158 60 154 92" : "M106 92C102 60 104 22 116 22C127 22 129 60 128 92"}" fill="#fff0bc"/>
        <path d="${right ? "M141 82Q141 42 145 36Q150 42 148 82" : "M112 82Q110 42 115 36Q119 42 119 82"}" fill="#f5bec8" stroke="none"/>
      </g>`,
        )
        .join(""),
      markings: `<path d="M114 105Q90 100 87 125M146 105Q170 100 173 125" fill="none" stroke-width="3.2"/>`,
      face: eyes({ duration: "3.6s" }) + cheeks() + mouth(true),
      arms: paw({ fill: "#fff0bc", side: "left" }) + paw({ fill: "#fff0bc" }),
    }),
  },
  momonga: {
    label: "Momonga swishes a fluffy tail, blinks, and waves",
    color: "#e0cde9",
    body: smallCharacter({
      back: `<g data-part="tail">${rotate("164 210", [0, -8, 0, 8, 0], "0;0.25;0.5;0.75;1", "4.2s")}<path d="M150 214Q118 150 145 92Q175 48 218 62Q256 86 246 150Q236 204 176 218Z" fill="#d7edf4" stroke="none"/><path d="${[
        [169, 66, 173, 76],
        [190, 60, 191, 71],
        [211, 65, 209, 76],
        [228, 77, 223, 87],
        [239, 97, 231, 104],
        [243, 118, 233, 122],
        [242, 141, 231, 139],
        [237, 163, 228, 157],
        [226, 185, 220, 175],
      ]
        .map(([x1, y1, x2, y2]) => `M${x1} ${y1}L${x2} ${y2}`)
        .join("")}" fill="none" stroke-width="2.5"/></g>`,
      ears: roundEars(white, "#d7edf4"),
      markings: `<path d="M58 132L38 125L45 139L32 146L48 153L39 164L63 166M202 132L222 125L215 139L228 146L212 153L221 164L197 166" fill="${white}" stroke-width="3"/><circle cx="130" cy="135" r="10" fill="#d7edf4" stroke="none"/>`,
      face: eyes({ style: "lidded", duration: "4.2s" }) + cheeks(153) + mouth(),
    }),
  },
  rakko: {
    label: "Rakko blinks and waves beside a sheathed sword",
    color: "#d7e2df",
    body: smallCharacter({
      fill: "#fff4d9",
      back: `<g transform="rotate(-24 89 190)"><path d="M77 154h12v76q-6 13 -12 0Z" fill="#686c74"/><path d="M73 151h20v8H73Z" fill="#b6bbc0"/><path d="M78 127h10v24H78Z" fill="${white}"/><path d="M79 133h8m-8 6h8m-8 6h8" stroke="${ink}" stroke-width="2"/></g>`,
      ears: `<ellipse cx="57" cy="114" rx="11" ry="9" fill="${ink}" stroke="none"/><ellipse cx="203" cy="114" rx="11" ry="9" fill="${ink}" stroke="none"/>`,
      head: `<path d="M55 137C53 94 83 63 129 63C174 62 206 94 205 137Q206 182 130 187Q55 182 55 137Z" fill="#fff4d9"/>`,
      markings: `<path d="M88 89l8 7 13 -10 -8 14 5 8 -10 -4 -12 9 6 -14Z" fill="#cbb48f" stroke-width="2.5"/><path d="M70 90l4 4m12 -20 3 5m14 -12 2 5m21 -9v5m21 -4 -1 5m19 0 -3 5m19 8 -4 4" fill="none" stroke-width="2.5"/>`,
      front: `<path d="M74 173Q129 194 185 173L180 191Q130 210 80 192Z" fill="${white}"/><path d="M83 191l-9 31 19 -7 6 -21M169 196l8 28 12 -9 -9 -24" fill="${white}"/>`,
      face: eyes({ style: "lidded", duration: "6s" }) + cheeks() + mouth(),
    }),
  },
  kurimanju: {
    label: "Kurimanju blinks and lifts a little cup",
    color: "#dae9b7",
    body: smallCharacter({
      fill: "#ffebca",
      ears: `<circle cx="65" cy="107" r="11" fill="#ffebca"/><circle cx="195" cy="107" r="11" fill="#ffebca"/>`,
      markings: `<path d="M69 96Q86 69 130 75Q173 70 192 96Q168 121 130 122Q91 120 69 96Z" fill="#ac7e62"/>`,
      face:
        eyes({ y: 140, duration: "6.6s" }) +
        cheeks(158) +
        `<ellipse cx="130" cy="145" rx="11" ry="7" fill="${blush}" stroke="none"/><path d="M126 142l-2 5m6 -5l-2 5m6 -5l-2 5" fill="none" stroke-width="1.8"/>` +
        mouth(),
      arms: paw({ fill: "#ffebca", side: "left", wave: false }),
      front: `<g data-part="cup-arm">${rotate("168 189", [0, 0, -28, -28, 0, 0, 0], "0;0.25;0.38;0.55;0.68;0.85;1", "6.6s")}<path d="M165 183q15 -7 23 3l3 15q-11 8 -25 -6" fill="#ffebca"/><path d="M187 169h21v24q-10 7 -21 0Z" fill="#fdfaf2"/><path d="M208 174q15 -1 12 11q-2 8 -12 5" fill="none" stroke-width="3"/><path d="M191 176h13" stroke="#bca084" stroke-width="2"/></g>`,
    }),
  },
  shisa: {
    label: "Shisa blinks and waves with a curled orange mane",
    color: "#f9d6ad",
    body: smallCharacter({
      fill: "#fff8de",
      back: `<path d="M68 96Q35 79 38 113Q20 117 37 140Q17 159 44 171Q32 195 70 190M192 96Q225 79 222 113Q240 117 223 140Q243 159 216 171Q228 195 190 190" fill="#f4ad7d"/><path d="M41 104l17 9m-24 15 17 10m-18 24 22 0m164 -58 -17 9m24 15 -17 10m18 24 -22 0" fill="none" stroke-width="2.5"/>`,
      ears: `<path d="M65 104Q47 81 62 63Q75 77 86 77L97 97M195 104Q213 81 198 63Q185 77 174 77L163 97" fill="#fff8de"/>`,
      markings: [false, true]
        .map(
          (right) =>
            `<g${right ? ' transform="matrix(-1 0 0 1 260 0)"' : ""}><path d="M84 121Q81 106 94 107Q96 96 107 100Q118 103 113 114Q107 113 106 120Q96 114 84 121Z" fill="#f4ad7d" stroke-width="3"/><path d="M97 109q4 -4 8 0" fill="none" stroke-width="2.2"/></g>`,
        )
        .join(""),
      face: eyes({ y: 137, duration: "5.8s" }) + cheeks(155) + mouth(),
    }),
  },
  furuhonya: {
    label: "Furuhonya blinks while crab claws wiggle above an open book",
    color: "#cbe1f3",
    body: smallCharacter({
      fill: "#fff0e9",
      ears: [false, true]
        .map(
          (right) =>
            `<g data-part="${right ? "right" : "left"}-claw">${rotate(right ? "178 96" : "82 96", right ? [0, 0, 12, -5, 12, 0, 0] : [0, 0, -12, 5, -12, 0, 0], undefined, "5.4s")}<path d="${right ? "M168 99Q151 66 176 50L186 66L201 58Q219 85 190 104Z" : "M92 99Q109 66 84 50L74 66L59 58Q41 85 70 104Z"}" fill="#f6bfc6"/></g>`,
        )
        .join(""),
      markings: `<path d="M59 108Q75 80 130 80Q184 80 201 108Q130 91 59 108Z" fill="#f6bfc6" stroke="none"/><path d="M121 81l-3 -8M130 80v-9M139 81l3 -8" fill="none" stroke-width="2.5"/><path d="M96 113l12 -1m-12 7l12 -1M152 112l12 1m-12 6l12 1" fill="none" stroke-width="3"/>`,
      face: eyes({ style: "closed", duration: "5.4s" }) + cheeks() + mouth(true),
      arms: "",
      front: `<g data-part="book"><path d="M91 192Q110 186 130 198Q150 186 169 192V227Q150 223 130 233Q110 223 91 227Z" fill="#95bec1"/><path d="M130 198v35M99 200q11 -2 23 4m-23 4q11 -2 23 4m16 -8q12 -6 23 -4m-23 12q12 -6 23 -4" fill="none" stroke="#577c82" stroke-width="2"/><path d="M91 199q-17 -2 -15 9q1 8 16 5M169 199q17 -2 15 9q-1 8 -16 5" fill="#fff0e9"/></g>`,
    }),
  },
};

function armor({ fill, prop, wave = true }) {
  return `<path d="M99 220l-5 25h26l5 -26M135 219l5 26h26l-5 -25" fill="${fill}"/>
    <path d="M85 143Q130 130 175 143L181 213Q165 237 130 237Q95 237 79 213Z" fill="${fill}"/>
    <path d="M89 194Q130 206 172 194M85 210Q130 222 175 210" fill="none" stroke-width="3"/>
    <g data-part="left-arm">${wave ? rotate("86 157", [0, 0, 18, -12, 18, 0, 0], undefined, "5.8s") : ""}
      <path d="M84 149Q66 148 62 168L51 169L49 146Q49 140 44 141L43 161L41 138Q40 133 36 137L36 161L32 141Q29 137 26 142L29 163Q19 154 19 164L24 181Q32 194 49 191L78 180Z" fill="${fill}"/>
      <path d="M28 171l21 -2m8 4 12 9" fill="none" stroke-width="2.5"/>
    </g>
    <g data-part="right-arm">${rotate("177 157", [0, 0, -8, 5, -8, 0, 0], undefined, "5.8s")}
      <path d="M177 151Q196 154 197 175L202 207Q198 219 188 212L174 176" fill="${fill}"/>
      <path d="M185 192l14 -3m-12 11 14 -3" fill="none" stroke-width="2.5"/>
    </g>
    <path d="M91 140Q67 137 61 157Q76 172 96 158M169 140Q193 137 199 157Q184 172 164 158" fill="${fill}"/>
    <g data-part="helmet">${rotate("130 144", [0, 0, -4, 0, 4, 0, 0], undefined, "5.8s")}
      <path d="M78 105Q70 48 127 44Q185 44 183 105L177 134Q157 153 130 157Q99 152 82 134Z" fill="${fill}"/>
      <path d="M87 102Q83 76 109 66Q126 63 131 56Q138 66 151 68Q175 77 174 102M130 72v20m0 6v1" fill="none" stroke-width="3"/>
      <path d="M86 107Q130 115 176 107L167 120Q152 129 131 119Q111 130 94 119Z" fill="${ink}" stroke-width="2"/>
      <path d="M112 132Q130 124 149 132L144 147H117Z" fill="${ink}"/>
      <path d="M119 134h5m8 0h5m5 0h2m-24 7h5m8 0h5" stroke="${white}" stroke-width="2"/>
      <path d="M119 128q11 -3 23 0M120 145h21" fill="none" stroke="#f2a7b3" stroke-width="2"/>
    </g>${prop}`;
}

illustrations["pochette-no-yoroi-san"] = {
  label: "Pochette no Yoroi-san waves and nods with a pink shoulder bag",
  color: "#ede9a8",
  body: armor({
    fill: "#d4d6d9",
    prop: `<path d="M91 147L173 215" stroke="${white}" stroke-width="11"/><path d="M91 147L173 215" fill="none" stroke-width="2.5"/><g data-part="bag">${rotate("165 205", [0, 0, -5, 5, -5, 0, 0], undefined, "5.8s")}<circle cx="152" cy="210" r="6.5" fill="#f6b8c8"/><circle cx="182" cy="210" r="6.5" fill="#f6b8c8"/><ellipse cx="167" cy="226" rx="19" ry="17" fill="#f6b8c8"/><ellipse cx="167" cy="230" rx="11" ry="8.5" fill="${white}" stroke="none"/><circle cx="162" cy="226" r="2" fill="${ink}" stroke="none"/><circle cx="173" cy="226" r="2" fill="${ink}" stroke="none"/><path d="M162 231q2.5 3.5 5 0q2.5 3.5 5 0" fill="none" stroke-width="2.2"/></g>`,
  }),
};
illustrations["roudou-no-yoroi-san"] = {
  label: "Roudou no Yoroi-san waves and nods with a work clipboard",
  color: "#f3c6bd",
  body: armor({
    fill: "#c8c0b2",
    prop: `<g transform="rotate(-8 167 203)"><rect x="143" y="174" width="49" height="61" rx="4" fill="#a5896b"/><rect x="149" y="181" width="36" height="47" rx="1" fill="#fff9eb" stroke="none"/><rect x="158" y="170" width="19" height="9" rx="2" fill="#d4d6d9" stroke-width="2"/><path d="M154 191h23m-23 8h23m-23 8h17m-17 8h20" fill="none" stroke="#a9b3ad" stroke-width="2"/></g>`,
  }),
};
illustrations["ramen-no-yoroi-san"] = {
  label: "Ramen no Yoroi-san waves a ladle and serves a steaming bowl",
  color: "#e9c4d8",
  body: armor({
    fill: "#ede56f",
    prop: `<g data-part="ladle">${rotate("46 164", [0, 0, 18, -12, 18, 0, 0], undefined, "5.8s")}<path d="M42 170L34 117" stroke="#7a7b80" stroke-width="7"/><ellipse cx="32" cy="110" rx="14" ry="12" fill="#d8dcdf" stroke-width="2.5"/></g><path d="M101 200h74Q170 229 138 230Q106 228 101 200Z" fill="#f8f4ea"/><ellipse cx="138" cy="200" rx="37" ry="8" fill="#e4ad69"/><path d="M115 201q8 -8 16 -1t17 0t15 -1" fill="none" stroke="#fff0ae" stroke-width="3"/><path d="M110 212h56" stroke="#cf7878" stroke-width="3"/><g data-part="steam" stroke="#b9b5ad" stroke-width="2" fill="none"><animate attributeName="opacity" values="0;0.65;0" dur="3s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0 0;0 -9" dur="3s" repeatCount="indefinite"/><path d="M124 190q-7 -6 0 -13m16 12q-7 -6 0 -13m14 13q-7 -6 0 -13"/></g>`,
  }),
};

for (const [id, { label, color, body }] of Object.entries(illustrations)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 260 270" role="img" aria-labelledby="title">
  <title id="title">${label}</title>
  <ellipse cx="130" cy="249" rx="73" ry="9" fill="${color}" opacity="0.65"/>
  <g stroke="${ink}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">
    ${body}
  </g>
</svg>\n`;
  writeFileSync(new URL(`${id}.svg`, output), svg);
}
console.log(`Generated ${Object.keys(illustrations).length} animated characters in ${fileURLToPath(output)}`);
