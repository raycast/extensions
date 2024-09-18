import { Form } from "@raycast/api";
import { playbackSpeedValues } from "../resources/playbackSpeedValues";

interface PlaybackSpeedDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PlaybackSpeedDropdown({ value, onChange }: PlaybackSpeedDropdownProps) {
  return (
    <Form.Dropdown id="playbackSpeed" title="Playback Speed" storeValue value={value} onChange={onChange}>
      {playbackSpeedValues.map((playbackSpeed) => (
        <Form.Dropdown.Item key={playbackSpeed} title={playbackSpeed + "x"} value={playbackSpeed}></Form.Dropdown.Item>
      ))}
    </Form.Dropdown>
  );
}
