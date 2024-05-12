<template>
  <div class="container">
    <svg
      viewBox="-100 -100 200 200"
      xmlns="http://www.w3.org/2000/svg"
      width="500"
      height="500"
      id="face-svg"
    >
      <defs>
        <clipPath id="leftEyeClipPath">
          <polyline :points="eyeLeftCountour" />
        </clipPath>
        <clipPath id="rightEyeClipPath">
          <polyline :points="eyeRightCountour" />
        </clipPath>

        <filter id="fuzzy">
          <feTurbulence
            id="turbulence"
            baseFrequency="0.05"
            numOctaves="3"
            type="noise"
            result="noise"
          />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
        </filter>
        <linearGradient id="rainbowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop
            offset="0%"
            :style="
              'stop-color: ' +
              hairColors[Math.floor(Math.random() * 10)] +
              ';  stop-opacity: 1'
            "
          />
          <stop
            :offset="dyeColorOffset"
            :style="
              'stop-color: ' +
              hairColors[Math.floor(Math.random() * hairColors.length)] +
              ';  stop-opacity: 1'
            "
          />
          <stop
            offset="100%"
            :style="
              'stop-color: ' +
              hairColors[Math.floor(Math.random() * hairColors.length)] +
              ';  stop-opacity: 1'
            "
          />
        </linearGradient>
      </defs>
      <title>That's an ugly face</title>
      <desc>CREATED BY XUAN TANG, MORE INFO AT TXSTC55.GITHUB.IO</desc>
      <rect
        x="-100"
        y="-100"
        width="100%"
        height="100%"
        :fill="
          backgroundColors[Math.floor(Math.random() * backgroundColors.length)]
        "
      />
      <polyline
        id="faceContour"
        :points="computedFacePoints"
        fill="#ffc9a9"
        stroke="black"
        :stroke-width="3.0 / faceScale"
        stroke-linejoin="round"
        filter="url(#fuzzy)"
      />

      <g
        :transform="
          'translate(' +
          (center[0] + distanceBetweenEyes + rightEyeOffsetX) +
          ' ' +
          -(-center[1] + eyeHeightOffset + rightEyeOffsetY) +
          ')'
        "
      >
        <polyline
          id="rightCountour"
          :points="eyeRightCountour"
          fill="white"
          stroke="white"
          :stroke-width="0.0 / faceScale"
          stroke-linejoin="round"
          filter="url(#fuzzy)"
        />
      </g>
      <g
        :transform="
          'translate(' +
          -(center[0] + distanceBetweenEyes + leftEyeOffsetX) +
          ' ' +
          -(-center[1] + eyeHeightOffset + leftEyeOffsetY) +
          ')'
        "
      >
        <polyline
          id="leftCountour"
          :points="eyeLeftCountour"
          fill="white"
          stroke="white"
          :stroke-width="0.0 / faceScale"
          stroke-linejoin="round"
          filter="url(#fuzzy)"
        />
      </g>
      <g
        :transform="
          'translate(' +
          (center[0] + distanceBetweenEyes + rightEyeOffsetX) +
          ' ' +
          -(-center[1] + eyeHeightOffset + rightEyeOffsetY) +
          ')'
        "
      >
        <polyline
          id="rightUpper"
          :points="eyeRightUpper"
          fill="none"
          stroke="black"
          :stroke-width="3.0 / faceScale"
          stroke-linejoin="round"
          filter="url(#fuzzy)"
        />
        <polyline
          id="rightLower"
          :points="eyeRightLower"
          fill="none"
          stroke="black"
          :stroke-width="4.0 / faceScale"
          stroke-linejoin="round"
          filter="url(#fuzzy)"
        />
        <circle
          v-for="i in 10"
          :key="i"
          :r="Math.random() * 2 + 3.0"
          :cx="rightPupilShiftX + Math.random() * 5 - 2.5"
          :cy="rightPupilShiftY + Math.random() * 5 - 2.5"
          stroke="black"
          fill="none"
          :stroke-width="1.0"
          filter="url(#fuzzy)"
          clip-path="url(#rightEyeClipPath)"
        />
      </g>
      <g
        :transform="
          'translate(' +
          -(center[0] + distanceBetweenEyes + leftEyeOffsetX) +
          ' ' +
          -(-center[1] + eyeHeightOffset + leftEyeOffsetY) +
          ')'
        "
      >
        <polyline
          id="leftUpper"
          :points="eyeLeftUpper"
          fill="none"
          stroke="black"
          :stroke-width="4.0 / faceScale"
          stroke-linejoin="round"
          filter="url(#fuzzy)"
        />
        <polyline
          id="leftLower"
          :points="eyeLeftLower"
          fill="none"
          stroke="black"
          :stroke-width="4.0 / faceScale"
          stroke-linejoin="round"
          filter="url(#fuzzy)"
        />
        <circle
          v-for="i in 10"
          :key="i"
          :r="Math.random() * 2 + 3.0"
          :cx="leftPupilShiftX + Math.random() * 5 - 2.5"
          :cy="leftPupilShiftY + Math.random() * 5 - 2.5"
          stroke="black"
          fill="none"
          :stroke-width="1.0"
          filter="url(#fuzzy)"
          clip-path="url(#leftEyeClipPath)"
        />
      </g>
      <g id="hairs">
        <polyline
          v-for="(hair, index) in hairs"
          :key="index"
          :points="hair"
          fill="none"
          :stroke="hairColor"
          :stroke-width="2"
          stroke-linejoin="round"
          filter="url(#fuzzy)"
        />
      </g>
      <g id="pointNose" v-if="Math.random() > 0.5">
        <g id="rightNose">
          <circle
            v-for="i in 10"
            :key="i"
            :r="Math.random() * 2 + 1.0"
            :cx="rightNoseCenterX + Math.random() * 4 - 2"
            :cy="rightNoseCenterY + Math.random() * 4 - 2"
            stroke="black"
            fill="none"
            :stroke-width="1.0"
            filter="url(#fuzzy)"
          />
        </g>
        <g id="leftNose">
          <circle
            v-for="i in 10"
            :key="i"
            :r="Math.random() * 2 + 1.0"
            :cx="leftNoseCenterX + Math.random() * 4 - 2"
            :cy="leftNoseCenterY + Math.random() * 4 - 2"
            stroke="black"
            fill="none"
            :stroke-width="1.0"
            filter="url(#fuzzy)"
          />
        </g>
      </g>
      <g id="lineNose" v-else>
        <path
          :d="
            'M ' +
            leftNoseCenterX +
            ' ' +
            leftNoseCenterY +
            ', Q' +
            rightNoseCenterX +
            ' ' +
            rightNoseCenterY * 1.5 +
            ',' +
            (leftNoseCenterX + rightNoseCenterX) / 2 +
            ' ' +
            -eyeHeightOffset * 0.2
          "
          fill="none"
          stroke="black"
          :stroke-width="3"
          stroke-linejoin="round"
          filter="url(#fuzzy)"
        ></path>
      </g>
      <g id="mouth">
        <polyline
          :points="mouthPoints"
          fill="rgb(215,127,140)"
          stroke="black"
          :stroke-width="3"
          stroke-linejoin="round"
          filter="url(#fuzzy)"
        />
      </g>
    </svg>
    <button @click="generateFace">ANOTHER</button>
    <button @click="downloadSVGAsPNG">DOWNLOAD</button>
  </div>
</template>

<script>
import * as faceShape from "../utils/face_shape.js";
import * as eyeShape from "../utils/eye_shape.js";
import * as hairLines from "../utils/hair_lines.js";
import * as mouthShape from "../utils/mouth_shape.js";

function randomFromInterval(min, max) {
  // min and max included
  return Math.random() * (max - min) + min;
}

export default {
  name: "FaceGenerator",
  data() {
    return {
      faceScale: 1.8, // face scale
      computedFacePoints: [], // the polygon points for face countour
      eyeRightUpper: [], // the points for right eye upper lid
      eyeRightLower: [],
      eyeRightCountour: [], // for the white part of the eye
      eyeLeftUpper: [],
      eyeLeftLower: [],
      eyeLeftCountour: [],
      faceHeight: 0, // the height of the face
      faceWidth: 0, // the width of the face
      center: [0, 0], // the center of the face
      distanceBetweenEyes: 0, // the distance between the eyes
      leftEyeOffsetX: 0, // the offset of the left eye
      leftEyeOffsetY: 0, // the offset of the left eye
      rightEyeOffsetX: 0, // the offset of the right eye
      rightEyeOffsetY: 0, // the offset of the right eye
      eyeHeightOffset: 0, // the offset of the eye height
      leftEyeCenter: [0, 0], // the center of the left eye
      rightEyeCenter: [0, 0], // the center of the right eye
      rightPupilShiftX: 0, // the shift of the right pupil
      rightPupilShiftY: 0, // the shift of the right pupil
      leftPupilShiftX: 0, // the shift of the left pupil
      leftPupilShiftY: 0, // the shift of the left pupil
      rightNoseCenterX: 0, // the center of the right nose
      rightNoseCenterY: 0, // the center of the right nose
      leftNoseCenterX: 0, // the center of the left nose
      leftNoseCenterY: 0, // the center of the left nose
      hairs: [],
      hairColors: [
        "rgb(0, 0, 0)", // Black
        "rgb(44, 34, 43)", // Dark Brown
        "rgb(80, 68, 68)", // Medium Brown
        "rgb(167, 133, 106)", // Light Brown
        "rgb(220, 208, 186)", // Blond
        "rgb(233, 236, 239)", // Platinum Blond
        "rgb(165, 42, 42)", // Red
        "rgb(145, 85, 61)", // Auburn
        "rgb(128, 128, 128)", // Grey
        "rgb(185, 55, 55)", // fire
        "rgb(255, 192, 203)", // Pastel Pink
        "rgb(255, 105, 180)", // Bright Pink
        "rgb(230, 230, 250)", // Lavender
        "rgb(64, 224, 208)", // Turquoise
        "rgb(0, 191, 255)", // Bright Blue
        "rgb(148, 0, 211)", // Deep Purple
        "rgb(50, 205, 50)", // Lime Green
        "rgb(255, 165, 0)", // Vivid Orange
        "rgb(220, 20, 60)", // Crimson Red
        "rgb(192, 192, 192)", // Silver
      ],
      hairColor: "black",
      dyeColorOffset: "50%",
      backgroundColors: [
        "rgb(245, 245, 220)", // Soft Beige
        "rgb(176, 224, 230)", // Pale Blue
        "rgb(211, 211, 211)", // Light Grey
        "rgb(152, 251, 152)", // Pastel Green
        "rgb(255, 253, 208)", // Cream
        "rgb(230, 230, 250)", // Muted Lavender
        "rgb(188, 143, 143)", // Dusty Rose
        "rgb(135, 206, 235)", // Sky Blue
        "rgb(245, 255, 250)", // Mint Cream
        "rgb(245, 222, 179)", // Wheat
        "rgb(47, 79, 79)", // Dark Slate Gray
        "rgb(72, 61, 139)", // Dark Slate Blue
        "rgb(60, 20, 20)", // Dark Brown
        "rgb(25, 25, 112)", // Midnight Blue
        "rgb(139, 0, 0)", // Dark Red
        "rgb(85, 107, 47)", // Olive Drab
        "rgb(128, 0, 128)", // Purple
        "rgb(0, 100, 0)", // Dark Green
        "rgb(0, 0, 139)", // Dark Blue
        "rgb(105, 105, 105)", // Dim Gray
      ],
      mouthPoints: [],
    };
  },
  methods: {
    generateFace() {
      let faceResults = faceShape.generateFaceCountourPoints();
      this.computedFacePoints = faceResults.face;
      this.faceHeight = faceResults.height;
      this.faceWidth = faceResults.width;
      this.center = faceResults.center;
      let eyes = eyeShape.generateBothEyes(this.faceWidth / 2);
      let left = eyes.left;
      let right = eyes.right;
      this.eyeRightUpper = right.upper;
      this.eyeRightLower = right.lower;
      this.eyeRightCountour = right.upper
        .slice(10, 90)
        .concat(right.lower.slice(10, 90).reverse());
      this.eyeLeftUpper = left.upper;
      this.eyeLeftLower = left.lower;
      this.eyeLeftCountour = left.upper
        .slice(10, 90)
        .concat(left.lower.slice(10, 90).reverse());
      this.distanceBetweenEyes = randomFromInterval(
        this.faceWidth / 4.5,
        this.faceWidth / 4
      );
      this.eyeHeightOffset = randomFromInterval(
        this.faceHeight / 8,
        this.faceHeight / 6
      );
      this.leftEyeOffsetX = randomFromInterval(
        -this.faceWidth / 20,
        this.faceWidth / 10
      );
      this.leftEyeOffsetY = randomFromInterval(
        -this.faceHeight / 50,
        this.faceHeight / 50
      );
      this.rightEyeOffsetX = randomFromInterval(
        -this.faceWidth / 20,
        this.faceWidth / 10
      );
      this.rightEyeOffsetY = randomFromInterval(
        -this.faceHeight / 50,
        this.faceHeight / 50
      );
      this.leftEyeCenter = left.center[0];
      this.rightEyeCenter = right.center[0];
      this.leftPupilShiftX = randomFromInterval(
        -this.faceWidth / 20,
        this.faceWidth / 20
      );

      // now we generate the pupil shifts
      // we first pick a point from the upper eye lid
      let leftInd0 = Math.floor(randomFromInterval(10, left.upper.length - 10));
      let rightInd0 = Math.floor(
        randomFromInterval(10, right.upper.length - 10)
      );
      let leftInd1 = Math.floor(randomFromInterval(10, left.upper.length - 10));
      let rightInd1 = Math.floor(
        randomFromInterval(10, right.upper.length - 10)
      );
      let leftLerp = randomFromInterval(0.2, 0.8);
      let rightLerp = randomFromInterval(0.2, 0.8);

      this.leftPupilShiftY =
        left.upper[leftInd0][1] * leftLerp +
        left.lower[leftInd1][1] * (1 - leftLerp);
      this.rightPupilShiftY =
        right.upper[rightInd0][1] * rightLerp +
        right.lower[rightInd1][1] * (1 - rightLerp);
      this.leftPupilShiftX =
        left.upper[leftInd0][0] * leftLerp +
        left.lower[leftInd1][0] * (1 - leftLerp);
      this.rightPupilShiftX =
        right.upper[rightInd0][0] * rightLerp +
        right.lower[rightInd1][0] * (1 - rightLerp);

      var numHairLines = [];
      var numHairMethods = 4;
      for (var i = 0; i < numHairMethods; i++) {
        numHairLines.push(Math.floor(randomFromInterval(0, 50)));
      }
      this.hairs = [];
      if (Math.random() > 0.3) {
        this.hairs = hairLines.generateHairLines0(
          this.computedFacePoints,
          numHairLines[0] * 1 + 10
        );
      }
      if (Math.random() > 0.3) {
        this.hairs = this.hairs.concat(
          hairLines.generateHairLines1(
            this.computedFacePoints,
            numHairLines[1] / 1.5 + 10
          )
        );
      }
      if (Math.random() > 0.5) {
        this.hairs = this.hairs.concat(
          hairLines.generateHairLines2(
            this.computedFacePoints,
            numHairLines[2] * 3 + 10
          )
        );
      }
      if (Math.random() > 0.5) {
        this.hairs = this.hairs.concat(
          hairLines.generateHairLines3(
            this.computedFacePoints,
            numHairLines[3] * 3 + 10
          )
        );
      }
      this.rightNoseCenterX = randomFromInterval(
        this.faceWidth / 18,
        this.faceWidth / 12
      );
      this.rightNoseCenterY = randomFromInterval(0, this.faceHeight / 5);
      this.leftNoseCenterX = randomFromInterval(
        -this.faceWidth / 18,
        -this.faceWidth / 12
      );
      this.leftNoseCenterY =
        this.rightNoseCenterY +
        randomFromInterval(-this.faceHeight / 30, this.faceHeight / 20);
      if (Math.random() > 0.1) {
        // use natural hair color
        this.hairColor = this.hairColors[Math.floor(Math.random() * 10)];
      } else {
        this.hairColor = "url(#rainbowGradient)";
        this.dyeColorOffset = randomFromInterval(0, 100) + "%";
      }

      var choice = Math.floor(Math.random() * 3);
      if (choice == 0) {
        this.mouthPoints = mouthShape.generateMouthShape0(
          this.computedFacePoints,
          this.faceHeight,
          this.faceWidth
        );
      } else if (choice == 1) {
        this.mouthPoints = mouthShape.generateMouthShape1(
          this.computedFacePoints,
          this.faceHeight,
          this.faceWidth
        );
      } else {
        this.mouthPoints = mouthShape.generateMouthShape2(
          this.computedFacePoints,
          this.faceHeight,
          this.faceWidth
        );
      }
    },
    downloadSVGAsPNG() {
      // download our svg as png
      const svg = document.getElementById("face-svg");
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = document.createElement("img");
      const svgSize = svg.getBoundingClientRect();
      canvas.width = svgSize.width;
      canvas.height = svgSize.height;
      img.setAttribute("src", "data:image/svg+xml;base64," + btoa(svgData));
      img.onload = function () {
        ctx.drawImage(img, 0, 0);
        const a = document.createElement("a");
        const e = new MouseEvent("click");
        a.download = "face.png";
        a.href = canvas.toDataURL("image/png");
        a.dispatchEvent(e);
      };
    },
  },
  mounted() {
    this.generateFace();
    // add key binding
    window.addEventListener("keydown", (e) => {
      if (e.key === " ") {
        this.generateFace();
        // this.downloadSVGAsPNG();
      } else if (e.key === "s") {
        this.downloadSVGAsPNG();
      }
    });
  },
};
</script>

<style scoped>
.container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: inline-flex;
  /* align-items items in column */
  flex-direction: column;
  /* center items horizontally */
  align-items: center;
  /* center items vertically */
  justify-content: center;
  background-color: #ffffff;
  padding: 5px;
}
svg {
  background-color: #ffffff;
}
button {
  margin-top: 10px;
  width: 200px;
  padding: 5px;
  background: transparent;
  border-width: 2px;
  font-size: 15px;
  border-color: black;
  color: black;
  font-weight: bold;
  user-select: none;
  border-radius: 10px;
  box-shadow: 2px 2px 0px 0px rgba(0, 0, 0, 0.75);
}

button:hover {
  background: black;
  color: white;
  transition: 0.3s;
}
button:active {
  background: rgb(65, 65, 65);
  box-shadow: 1px 1px 0px 0px rgba(0, 0, 0, 0.75);
}
</style>
