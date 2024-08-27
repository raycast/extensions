import * as faceShape from "../../lib/ugly-avatar/src/utils/face_shape.js";
import * as eyeShape from "../../lib/ugly-avatar/src/utils/eye_shape.js";
import * as hairLines from "../../lib/ugly-avatar/src/utils/hair_lines.js";
import * as mouthShape from "../../lib/ugly-avatar/src/utils/mouth_shape.js";

function randomFromInterval(min: number, max: number) {
  // min and max included
  return Math.random() * (max - min) + min;
}

export const hairColors = [
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
];
export const backgroundColors = [
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
];

type SvgProps = {
  hairColor: string | null;
  backgroundColor: string | null;
  width: number;
  height: number;
};
/**
 * This code translate original Vue code to React
 */
export function Svg({ hairColor, backgroundColor, width, height }: SvgProps) {
  const faceScale = 1.8;

  let rightPupilShiftX: number = 0;
  let rightPupilShiftY: number = 0;
  let leftPupilShiftX: number = 0;
  let leftPupilShiftY: number = 0;
  let rightNoseCenterX: number = 0;
  let rightNoseCenterY: number = 0;
  // let hairColor: string = "black";
  let dyeColorOffset: string = "50%";
  let mouthPoints: number[][];

  if (backgroundColor == null) {
    backgroundColor = backgroundColors[Math.floor(Math.random() * backgroundColors.length)];
  }

  if (hairColor == null) {
    if (Math.random() > 0.1) {
      // use natural hair color
      hairColor = hairColors[Math.floor(Math.random() * 10)];
    } else {
      hairColor = "url(#rainbowGradient)";
      dyeColorOffset = randomFromInterval(0, 100) + "%";
    }
  }

  const faceResults = faceShape.generateFaceCountourPoints();
  const computedFacePoints = faceResults.face;
  const faceHeight = faceResults.height;
  const faceWidth = faceResults.width;
  const center = faceResults.center;
  const eyes = eyeShape.generateBothEyes(faceWidth / 2);
  const left = eyes.left;
  const right = eyes.right;
  const eyeRightUpper = right.upper;
  const eyeRightLower = right.lower;
  const eyeRightCountour = right.upper.slice(10, 90).concat(right.lower.slice(10, 90).reverse());
  const eyeLeftUpper = left.upper;
  const eyeLeftLower = left.lower;
  const eyeLeftCountour = left.upper.slice(10, 90).concat(left.lower.slice(10, 90).reverse());
  const distanceBetweenEyes = randomFromInterval(faceWidth / 4.5, faceWidth / 4);
  const eyeHeightOffset = randomFromInterval(faceHeight / 8, faceHeight / 6);
  const leftEyeOffsetX = randomFromInterval(-faceWidth / 20, faceWidth / 10);
  const leftEyeOffsetY = randomFromInterval(-faceHeight / 50, faceHeight / 50);
  const rightEyeOffsetX = randomFromInterval(-faceWidth / 20, faceWidth / 10);
  const rightEyeOffsetY = randomFromInterval(-faceHeight / 50, faceHeight / 50);
  leftPupilShiftX = randomFromInterval(-faceWidth / 20, faceWidth / 20);

  // now we generate the pupil shifts
  // we first pick a point from the upper eye lid
  const leftInd0 = Math.floor(randomFromInterval(10, left.upper.length - 10));
  const rightInd0 = Math.floor(randomFromInterval(10, right.upper.length - 10));
  const leftInd1 = Math.floor(randomFromInterval(10, left.upper.length - 10));
  const rightInd1 = Math.floor(randomFromInterval(10, right.upper.length - 10));
  const leftLerp = randomFromInterval(0.2, 0.8);
  const rightLerp = randomFromInterval(0.2, 0.8);

  leftPupilShiftY = left.upper[leftInd0][1] * leftLerp + left.lower[leftInd1][1] * (1 - leftLerp);
  rightPupilShiftY = right.upper[rightInd0][1] * rightLerp + right.lower[rightInd1][1] * (1 - rightLerp);
  leftPupilShiftX = left.upper[leftInd0][0] * leftLerp + left.lower[leftInd1][0] * (1 - leftLerp);
  rightPupilShiftX = right.upper[rightInd0][0] * rightLerp + right.lower[rightInd1][0] * (1 - rightLerp);

  const numHairLines = [];
  const numHairMethods = 4;
  for (let i = 0; i < numHairMethods; i++) {
    numHairLines.push(Math.floor(randomFromInterval(0, 50)));
  }
  let hairs: number[][][] = [];
  if (Math.random() > 0.3) {
    hairs = hairLines.generateHairLines0(computedFacePoints, numHairLines[0] * 1 + 10);
  }
  if (Math.random() > 0.3) {
    hairs = hairs.concat(hairLines.generateHairLines1(computedFacePoints, numHairLines[1] / 1.5 + 10));
  }
  if (Math.random() > 0.5) {
    hairs = hairs.concat(hairLines.generateHairLines2(computedFacePoints, numHairLines[2] * 3 + 10));
  }
  if (Math.random() > 0.5) {
    hairs = hairs.concat(hairLines.generateHairLines3(computedFacePoints, numHairLines[3] * 3 + 10));
  }
  rightNoseCenterX = randomFromInterval(faceWidth / 18, faceWidth / 12);
  rightNoseCenterY = randomFromInterval(0, faceHeight / 5);
  const leftNoseCenterX = randomFromInterval(-faceWidth / 18, -faceWidth / 12);
  const leftNoseCenterY = rightNoseCenterY + randomFromInterval(-faceHeight / 30, faceHeight / 20);

  const choice = Math.floor(Math.random() * 3);
  if (choice == 0) {
    mouthPoints = mouthShape.generateMouthShape0(computedFacePoints, faceHeight, faceWidth);
  } else if (choice == 1) {
    mouthPoints = mouthShape.generateMouthShape1(computedFacePoints, faceHeight, faceWidth);
  } else {
    mouthPoints = mouthShape.generateMouthShape2(computedFacePoints, faceHeight, faceWidth);
  }

  const rangeTen = [...Array(10).keys()];

  return (
    <svg viewBox="-100 -100 200 200" xmlns="http://www.w3.org/2000/svg" width={width} height={height} id="face-svg">
      <defs>
        <clipPath id="leftEyeClipPath">
          <polyline points={eyeLeftCountour.flat().join(",")} />
        </clipPath>
        <clipPath id="rightEyeClipPath">
          <polyline points={eyeRightCountour.flat().join(",")} />
        </clipPath>

        <filter id="fuzzy">
          <feTurbulence id="turbulence" baseFrequency="0.05" numOctaves="3" type="noise" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
        </filter>
        <linearGradient id="rainbowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop
            offset="0%"
            style={{
              stopColor: hairColors[Math.floor(Math.random() * 10)],
              stopOpacity: 1,
            }}
          />
          <stop
            offset={dyeColorOffset}
            style={{
              stopColor: hairColors[Math.floor(Math.random() * hairColors.length)],
              stopOpacity: 1,
            }}
          />
          <stop
            offset="100%"
            style={{
              stopColor: hairColors[Math.floor(Math.random() * hairColors.length)],
              stopOpacity: 1,
            }}
          />
        </linearGradient>
      </defs>
      <title>That's an ugly face</title>
      <desc>CREATED BY XUAN TANG, MORE INFO AT TXSTC55.GITHUB.IO</desc>
      <rect x="-100" y="-100" width="100%" height="100%" fill={backgroundColor} />
      <polyline
        id="faceContour"
        points={computedFacePoints.flat().join(",")}
        fill="#ffc9a9"
        stroke="black"
        strokeWidth={3.0 / faceScale}
        strokeLinejoin="round"
        filter="url(#fuzzy)"
      />
      <g
        transform={`translate(${center[0] + distanceBetweenEyes + rightEyeOffsetX} ${-(-center[1] + eyeHeightOffset + rightEyeOffsetY)})`}
      >
        <polyline
          id="rightCountour"
          points={eyeRightCountour.flat().join(",")}
          fill="white"
          stroke="white"
          strokeWidth={0.0 / faceScale}
          strokeLinejoin="round"
          filter="url(#fuzzy)"
        />
      </g>

      <g
        transform={`translate(${-(center[0] + distanceBetweenEyes + leftEyeOffsetX)} ${-(-center[1] + eyeHeightOffset + leftEyeOffsetY)})`}
      >
        <polyline
          id="leftCountour"
          points={eyeLeftCountour.flat().join(",")}
          fill="white"
          stroke="white"
          strokeWidth={0.0 / faceScale}
          strokeLinejoin="round"
          filter="url(#fuzzy)"
        />
      </g>

      <g
        transform={`translate(${center[0] + distanceBetweenEyes + rightEyeOffsetX} ${-(-center[1] + eyeHeightOffset + rightEyeOffsetY)})`}
      >
        <polyline
          id="rightUpper"
          points={eyeRightUpper.flat().join(",")}
          fill="none"
          stroke="black"
          strokeWidth={3.0 / faceScale}
          strokeLinejoin="round"
          filter="url(#fuzzy)"
        />
        <polyline
          id="rightLower"
          points={eyeRightLower.flat().join(",")}
          fill="none"
          stroke="black"
          strokeWidth={4.0 / faceScale}
          strokeLinejoin="round"
          filter="url(#fuzzy)"
        />
        {rangeTen.map((i) => (
          <circle
            key={i}
            r={Math.random() * 2 + 3.0}
            cx={rightPupilShiftX + Math.random() * 5 - 2.5}
            cy={rightPupilShiftY + Math.random() * 5 - 2.5}
            stroke="black"
            fill="none"
            strokeWidth="1.0"
            filter="url(#fuzzy)"
            clipPath="url(#rightEyeClipPath)"
          />
        ))}
      </g>
      <g
        transform={`translate(${-(center[0] + distanceBetweenEyes + leftEyeOffsetX)} ${-(-center[1] + eyeHeightOffset + leftEyeOffsetY)})`}
      >
        <polyline
          id="leftUpper"
          points={eyeLeftUpper.flat().join(",")}
          fill="none"
          stroke="black"
          strokeWidth={4.0 / faceScale}
          strokeLinejoin="round"
          filter="url(#fuzzy)"
        />
        <polyline
          id="leftLower"
          points={eyeLeftLower.flat().join(",")}
          fill="none"
          stroke="black"
          strokeWidth={4.0 / faceScale}
          strokeLinejoin="round"
          filter="url(#fuzzy)"
        />
        {rangeTen.map((i) => (
          <circle
            key={i}
            r={Math.random() * 2 + 3.0}
            cx={leftPupilShiftX + Math.random() * 5 - 2.5}
            cy={leftPupilShiftY + Math.random() * 5 - 2.5}
            stroke="black"
            fill="none"
            strokeWidth="1.0"
            filter="url(#fuzzy)"
            clipPath="url(#leftEyeClipPath)"
          />
        ))}
      </g>

      <g id="hairs">
        {hairs.map((hair, index) => (
          <polyline
            key={index}
            points={hair.flat().join(",")}
            fill="none"
            stroke={hairColor}
            strokeWidth="2"
            strokeLinejoin="round"
            filter="url(#fuzzy)"
          />
        ))}
      </g>

      {Math.random() > 0.5 ? (
        <g id="pointNose">
          <g id="rightNose">
            {rangeTen.map((i) => (
              <circle
                key={i}
                r={Math.random() * 2 + 1.0}
                cx={rightNoseCenterX + Math.random() * 4 - 2}
                cy={rightNoseCenterY + Math.random() * 4 - 2}
                stroke="black"
                fill="none"
                strokeWidth="1.0"
                filter="url(#fuzzy)"
              />
            ))}
          </g>
          <g id="leftNose">
            {rangeTen.map((i) => (
              <circle
                key={i}
                r={Math.random() * 2 + 1.0}
                cx={rightNoseCenterX + Math.random() * 4 - 2}
                cy={rightNoseCenterY + Math.random() * 4 - 2}
                stroke="black"
                fill="none"
                strokeWidth="1.0"
                filter="url(#fuzzy)"
              />
            ))}
          </g>
        </g>
      ) : (
        <g id="lineNose">
          <path
            d={`M ${rightNoseCenterX} ${rightNoseCenterY}, Q${leftNoseCenterX} ${leftNoseCenterY * 1.5},${(rightNoseCenterX + leftNoseCenterX) / 2} ${-eyeHeightOffset * 0.2}`}
            fill="none"
            stroke="black"
            strokeWidth="3"
            strokeLinejoin="round"
            filter="url(#fuzzy)"
          ></path>
        </g>
      )}

      <g id="mouth">
        <polyline
          points={mouthPoints.flat().join(",")}
          fill="rgb(215,127,140)"
          stroke="black"
          strokeWidth="3"
          strokeLinejoin="round"
          filter="url(#fuzzy)"
        />
      </g>
    </svg>
  );
}
