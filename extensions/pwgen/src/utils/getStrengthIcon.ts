import { Color, Icon, Image } from '@raycast/api'

import { STRENGTH_HORRIBLE, STRENGTH_STRONG, STRENGTH_WEAK } from './constants'

export const getStrengthIcon = (strength: number): { source: Image.Source; tintColor: Color.ColorLike } => {
	let tintColor = Color.Orange

	if (strength <= STRENGTH_HORRIBLE) {
		tintColor = Color.Purple
	}

	if (strength > STRENGTH_HORRIBLE && strength <= STRENGTH_WEAK) {
		tintColor = Color.Red
	}

	if (strength >= STRENGTH_STRONG) {
		tintColor = Color.Green
	}

	return {
		source: Icon.Circle,
		tintColor,
	}
}
