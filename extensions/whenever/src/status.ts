import { Icon, type Color, type Image } from '@raycast/api';
import { TONE_COLOR, type Presentation, type Tone } from './presentation.ts';

export const toneColor = (tone: Tone): Color.Dynamic => TONE_COLOR[tone];
export function statusIcon(presentation: Presentation, source: Image.Source = Icon.CircleFilled) {
	return {
		value: { source, tintColor: toneColor(presentation.tone) },
		tooltip: presentation.description ?? presentation.label,
	};
}
export function statusTag(presentation: Presentation) {
	return {
		tag: { value: presentation.label, color: toneColor(presentation.tone) },
		...(presentation.description === undefined ? {} : { tooltip: presentation.description }),
	};
}
