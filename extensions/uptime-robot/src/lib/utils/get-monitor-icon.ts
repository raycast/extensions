import { Color, Icon, Image } from "@raycast/api";

export default function getMonitorIcon(status: number): Image.ImageLike {
    switch (status) {
        case 0:
            return { source: Icon.Pause, tintColor: Color.Yellow };
        case 1:
            return Icon.Minus;
        case 2:
            return { source: Icon.Play, tintColor: Color.Green };
        case 8:
            return { source: Icon.ArrowDown, tintColor: Color.Orange };
        case 9:
            return { source: Icon.Stop, tintColor: Color.Red };
        default:
            return Icon.QuestionMark;
    }
}