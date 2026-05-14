import { ActionPanel, Action, Form, showToast, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";

interface GameYaw {
  game: string;
  yaw: number;
}

const GAME_YAWS: GameYaw[] = [
  { game: "Apex Legends", yaw: 0.022 },
  { game: "Battlefield 5", yaw: 0.022 },
  { game: "CS (1.6)", yaw: 0.022 },
  { game: "Destiny 2", yaw: 0.0066 },
  { game: "DOOM", yaw: 0.0439453125 },
  { game: "Fortnite", yaw: 0.5715 },
  { game: "Overwatch", yaw: 0.0066 },
  { game: "Overwatch 2", yaw: 0.006666 },
  { game: "PUBG", yaw: 2.22222 },
  { game: "QCDE", yaw: 0.0439453125 },
  { game: "Q3 Arena", yaw: 0.022 },
  { game: "Quake", yaw: 0.022 },
  { game: "Quake Live", yaw: 0.02105 },
  { game: "Rainbow Six", yaw: 0.00572957795130823 },
  { game: "Reflex", yaw: 0.00572957795130823 },
  { game: "Siege", yaw: 0.00572957795130823 },
  { game: "Source (CS2, CSGO)", yaw: 0.022 },
  { game: "Unreal Tournament", yaw: 0.596 },
  { game: "VAL", yaw: 0.07 },
  { game: "Valorant", yaw: 0.07 },
];

function getGameYaw(gameName: string): number {
  const found = GAME_YAWS.find((g) => g.game === gameName);
  return found ? found.yaw : 0;
}

export default function Cm360Calculator() {
  const [game, setGame] = useState<string>("");
  const [sensitivity, setSensitivity] = useState<string>("");
  const [dpi, setDpi] = useState<string>("");
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    const sens = parseFloat(sensitivity);
    const dpiNum = parseInt(dpi);
    const yaw = getGameYaw(game);

    if (game && !isNaN(sens) && sens > 0 && !isNaN(dpiNum) && dpiNum > 0 && yaw > 0) {
      const inc = yaw * sens;
      const countsPerRev = 360 / inc;
      const cm360 = (countsPerRev / dpiNum) * 2.54;
      setResult(cm360.toFixed(4));
    } else {
      setResult("");
    }
  }, [game, sensitivity, dpi]);

  const handleSubmit = () => {
    if (result) {
      Clipboard.copy(result);
      showToast({
        title: `cm/360 for ${game}`,
        message: `${result} cm/360 copied to clipboard`,
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy Result" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Calculate cm/360° in a given game" />

      <Form.Separator />

      <Form.Dropdown id="game" title="Game" value={game} onChange={setGame}>
        {GAME_YAWS.map((g) => (
          <Form.Dropdown.Item key={g.game} value={g.game} title={g.game} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="sensitivity"
        title="In-Game Sensitivity"
        placeholder="e.g., 0.5"
        value={sensitivity}
        onChange={setSensitivity}
      />

      <Form.TextField id="dpi" title="Mouse DPI" placeholder="e.g., 800" value={dpi} onChange={setDpi} />

      <>
        <Form.Separator />
        <Form.TextField id="result" title="cm/360 Result" value={result} onChange={() => {}} />
      </>
    </Form>
  );
}
