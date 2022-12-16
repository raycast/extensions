import { getSelectedText, Clipboard, Toast, showToast } from '@raycast/api'

const lowerCaseWords = [
	'a',
	'an',
	'the',
	'and',
	'but',
	'or',
	'nor',
	'for',
	'yet',
	'so',
	'if',
	'en',
	'as',
	'vs.',
	'of',
	'in',
	'to',
]

const sentenceEnds = (word: string): boolean => ['.', ':', ';', '!', '?'].includes(word.charAt(word.length - 1))

const titleCapitalizeText = async () => {
	try {
		const text = await getSelectedText()

		if (text.length === 0) {
			await showToast(Toast.Style.Failure, 'Please select text first.')
			return null
		}

		const words = text.split(' ')

		let isNewSentence = true

		for (let i = 0; i < words.length; i++) {
			const word = words[i]

			// Always capitalize first and last word
			if (isNewSentence || i === words.length) {
				words[i] = word.charAt(0).toUpperCase() + word.slice(1)
			} else if (lowerCaseWords.includes(word.toLowerCase())) {
				words[i] = word.toLowerCase()
			} else {
				words[i] = word.charAt(0).toUpperCase() + word.slice(1)
			}

			isNewSentence = sentenceEnds(word)
		}

		// Join the array of words back into a single string and return it
		const translation = words.join(' ')

		await Clipboard.copy(translation)
		await showToast(Toast.Style.Success, 'The capitalized text was copied to your clipboard.')
	} catch (e) {
		await showToast(Toast.Style.Failure, 'Couldn\'t get text selection or unable to convert it.')
	}

	return null
}

export default titleCapitalizeText
