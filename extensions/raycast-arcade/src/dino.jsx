import { Detail, ActionPanel, Action, environment, Icon } from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import sound from "sound-play";

export default function ChromeDino() {
  const Status = {
    PLAYING: "playing",
    GAMEOVER: "gameover",
  };

  let playSound = (name) => {
    sound.play(environment.assetsPath + "/sfx/" + name);
  };

  const cactiShapes = [
    `
  ▄█▄
█ ███
▀▀███
   ██`,
    `
▄█▄  
███ █
███▀▀
███  `,
    `
██   
███ █
███▀▀
██   `,
    `
  ██   
█ ███
▀▀███
   ██`,
    `
     █  
██ ▀██ 
██▀ ██▀
██  ██ `,
  ];
  const cloudShapes = [
    `
   ░░░░░░░░░░
  ░░░░░░░░░░░░░░░
░░░░░░░░░░░░`,
    `
  ░░░░░░░░░░░
░░░░░░░░░░░░░░░
░░░░░░░░░░░░`,
    `
 ░░░░░░░░░░░
░░░░░░░░░░░░░░░
    ░░░░░░░░░░░░`,
    `
    ░░░░░░░░░░░
   ░░░░░░░░░░░░░░░
░░░░░░░░░░░░`,
  ];

  const dinoRunFrames = [
    `
        ▄█▀████▄
        ████▀▀▀▀
   ▄   ▄██▀▀▀▀▀ 
   ▀█▄████▄     
    ▀████▀      
     █▄ ▀▀      `,
    `
        ▄█▀████▄
        ████▀▀▀▀
   ▄   ▄██▀▀▀▀▀ 
   ▀█▄████▄     
    ▀████▀      
     ▀▀ █▄      `,
  ];

  const dinoJumpFrame = `
        ▄█▀████▄
        ████▀▀▀▀
   ▄   ▄██▀▀▀▀▀ 
   ▀█▄████▄     
    ▀████▀      
     █▄ █▄      `;

  const dinoHitFrame = `
        ▄██████▄
        ██X█████
   ▄   ▄██▀▀▀▀▀ 
   ▀█▄████▄     
    ▀████▀      
     █▄ █▄      `;

  const gameOver = `
                  
 G A M E  O V E R 
                  
   ▄██████████▄   
   ██▀▀▀▀▀▀▀███   
   ████▀███ ███   
   ███▄ ▄▄▄▄███   
   ▀██████████▀   
                  
     `;

  let boardWidth = environment.textSize === "medium" ? 106 : 92;
  let boardHeight = environment.textSize === "medium" ? 20 : 17;
  let [markdown, setMarkdown] = useState(
    Array(boardHeight)
      .fill()
      .map(() => Array(boardWidth).fill(" ")),
  );
  let status = useRef(Status.PLAYING);
  let time = useRef(0);
  let dinoStatus = useRef({
    y: 0,
    gravity: 0,
  });
  let isTicking = useRef(false);
  let activeCacti = useRef([]);
  let activeClouds = useRef([]);
  let score = useRef(0);
  function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  useEffect(() => {
    if (!isTicking.current) {
      tick();
      isTicking.current = true;
    }
  }, []);

  let tick = () => {
    if (time.current % 5 === 0) {
      if (score.current > 0 && score.current % 100 === 0) {
        playSound("dinoCoinSFX.mov");
      }
      score.current += 1;
    }
    if (status.current === Status.PLAYING) {
      dinoStatus.current.y = Math.round(Math.max(dinoStatus.current.y + dinoStatus.current.gravity, 0));
      if (time.current === 60) {
        activeCacti.current.push({
          x: boardWidth,
          shape: cactiShapes[Math.floor(Math.random() * cactiShapes.length)],
          time: time.current,
        });
      }
      if (time.current > 60 && time.current - activeCacti.current.at(-1).time > 40) {
        if (Math.random() < 0.02) {
          activeCacti.current.push({
            x: boardWidth,
            shape: cactiShapes[Math.floor(Math.random() * cactiShapes.length)],
            time: time.current,
          });
        }
      }
      if (time.current > 60 && time.current - activeCacti.current.at(-1).time > 100) {
        activeCacti.current.push({
          x: boardWidth,
          shape: cactiShapes[Math.floor(Math.random() * cactiShapes.length)],
          time: time.current,
        });
      }

      if (time.current % 70 === 0) {
        activeClouds.current.push({
          x: boardWidth,
          y: getRandomNumber(0, 5),
          shape: cloudShapes[Math.floor(Math.random() * cloudShapes.length)],
        });
      }
      if (dinoStatus.current.y !== 0) {
        dinoStatus.current.gravity -= 1 / 5;
      }
      let frame;
      if (dinoStatus.current.y !== 0) {
        frame = dinoJumpFrame.split("\n").map((x) => x.split(""));
      } else {
        frame = dinoRunFrames[Math.floor(time.current / 5) % 2].split("\n").map((x) => x.split(""));
      }

      let newMarkdown = Array(boardHeight)
        .fill()
        .map(() => Array(boardWidth).fill(" "));
      newMarkdown[16] = Array(boardWidth).fill("_");

      for (let i = 0; i < activeCacti.current.length; i++) {
        let cactus = activeCacti.current[i];

        // ! SPEED CURVE
        cactus.x -= 1 + ((score.current - 10) * 0.02) / 10;

        let cactusFrame = cactus.shape.split("\n").map((x) => x.split(""));
        for (let i = 0; i < cactusFrame.length; i++) {
          for (let j = 0; j < cactusFrame[i].length; j++) {
            if (
              cactusFrame[i][j + Math.floor(cactus.x)] !== " " &&
              j + Math.floor(cactus.x) > 0 &&
              j + Math.floor(cactus.x) < boardWidth - 1
            ) {
              newMarkdown[i + 12][j + Math.floor(cactus.x)] = cactusFrame[i][j];
            }
          }
        }
        if (cactus.x < -200) {
          activeCacti.current.splice(i, 1);
        }
      }

      for (let i = 0; i < activeClouds.current.length; i++) {
        let cloud = activeClouds.current[i];
        cloud.x -= 0.5;
        let cloudFrame = cloud.shape.split("\n").map((x) => x.split(""));
        for (let i = 0; i < cloudFrame.length; i++) {
          for (let j = 0; j < cloudFrame[i].length; j++) {
            if (
              cloudFrame[i][j + Math.floor(cloud.x)] !== " " &&
              j + Math.floor(cloud.x) > 0 &&
              j + Math.floor(cloud.x) < boardWidth - 1
            ) {
              newMarkdown[i + cloud.y][j + Math.floor(cloud.x)] = cloudFrame[i][j];
            }
          }
        }
        if (cloud.x < -20) {
          activeClouds.current.splice(i, 1);
        }
      }

      for (let i = 0; i < frame.length; i++) {
        for (let j = 0; j < frame[i].length; j++) {
          if (frame[i][j] !== " " && i + -dinoStatus.current.y + 10 > 0) {
            if (["_", " ", "░"].includes(newMarkdown[i + -dinoStatus.current.y + 10][j])) {
              newMarkdown[i + -dinoStatus.current.y + 10][j] = frame[i][j];
            } else {
              playSound("dinoEndSFX.mov");
              status.current = Status.GAMEOVER;
              break;
            }
          }
        }
        if (status.current == Status.GAMEOVER) break;
      }

      if (status.current === Status.GAMEOVER) {
        let dinoHitFrameProcessed = dinoHitFrame.split("\n").map((x) => x.split(""));
        for (let i = 0; i < dinoHitFrameProcessed.length; i++) {
          for (let j = 0; j < dinoHitFrameProcessed[i].length; j++) {
            if (dinoHitFrameProcessed[i][j] !== " " && i + -dinoStatus.current.y + 10 > 0) {
              newMarkdown[i + -dinoStatus.current.y + 10][j] = dinoHitFrameProcessed[i][j];
            }
          }
        }

        let endScreen = gameOver.split("\n").map((x) => x.split(""));
        for (let i = 0; i < endScreen.length; i++) {
          for (let j = 0; j < endScreen[i].length; j++) {
            newMarkdown[i + Math.floor(boardHeight / 2 - endScreen.length / 2)][
              j + Math.floor(boardWidth / 2 - endScreen[i].length / 2)
            ] = endScreen[i][j];
          }
        }
      }

      let scoreString = `SCORE: ${score.current}`.split("").reverse().join("");
      for (let i = 0; i < scoreString.length; i++) {
        newMarkdown[1][newMarkdown[0].length - 1 - i] = scoreString[i];
      }
      setMarkdown(newMarkdown);

      time.current++;
      setTimeout(tick, 25);
    } else {
      isTicking.current = false;
    }
  };

  let jump = () => {
    if (dinoStatus.current.y === 0) {
      playSound("dinoJumpSFX.mov");
      dinoStatus.current.gravity = 2.25;
    }
  };

  let enter = () => {
    if (status.current === Status.PLAYING) {
      jump();
    }
    if (status.current === Status.GAMEOVER) {
      playSound("dinoJumpSFX.mov");
      time.current = 0;
      dinoStatus.current = {
        y: 0,
        gravity: 0,
      };
      activeCacti.current = [];
      activeClouds.current = [];
      score.current = 0;
      status.current = Status.PLAYING;
      if (!isTicking.current) {
        tick();
        isTicking.current = true;
      }
    }
  };

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action
            icon={status.current === Status.PLAYING ? Icon.ArrowUp : Icon.RotateClockwise}
            title={status.current === Status.PLAYING ? "Jump" : "Restart"}
            onAction={() => {
              enter();
            }}
          />
        </ActionPanel>
      }
      markdown={`\n\`\`\`${markdown.map((x) => x.join("")).join("\n")}\n\`\`\``}
    ></Detail>
  );
}
