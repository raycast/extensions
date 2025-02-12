interface EsseCategory {
	items: EsseItem[];
	category: string;
}

interface EsseItem {
	id: string;
	title: string;
	match: string;
	description: string;
	autocomplete: string[];
}

export const ESSE_ACTIONS: EsseCategory[] = [
	{
		items: [
			{
				id: "co.ameba.Esse.ASCIIFunctions.ASCIICowSay",
				title: "Cowsay",
				match: "Cowsay Cow says whatever you want! Non-monospaced font, may look odd...",
				description: "Cow says whatever you want! Non-monospaced font, may look odd...",
				autocomplete: ["Cowsay"],
			},
			{
				id: "co.ameba.Esse.ASCIIFunctions.signBunny",
				title: "Sign Bunny",
				match: "Sign Bunny Bunny with an important message! Non-monospaced font, may look odd...",
				description: "Bunny with an important message! Non-monospaced font, may look odd...",
				autocomplete: ["Sign", "Bunny"],
			},
		],
		category: "ASCII",
	},
	{
		items: [
			{
				id: "co.ameba.Esse.CaseFunctions.camelCase",
				title: "Camel Case",
				match: "Camel Case Transforms by concatenating capitalized words but first character is lowercased",
				description: "Transforms by concatenating capitalized words but first character is lowercased",
				autocomplete: ["Camel", "Case"],
			},
			{
				id: "co.ameba.Esse.CaseFunctions.capitaliseWords",
				title: "Capitalize Words",
				match:
					"Capitalize Words Replace the first character in each word changed to its corresponding uppercase value, and all remaining characters set to their corresponding lowercase values.",
				description:
					"Replace the first character in each word changed to its corresponding uppercase value, and all remaining characters set to their corresponding lowercase values.",
				autocomplete: ["Capitalize", "Words"],
			},
			{
				id: "co.ameba.Esse.CaseFunctions.chmosCase",
				title: "Chicago Manual of Style",
				match: "Chicago Manual of Style Do Not Capitalize Words Based on Length",
				description: "Do Not Capitalize Words Based on Length",
				autocomplete: ["Chicago", "Manual", "of", "Style"],
			},
			{
				id: "co.ameba.Esse.CaseFunctions.kebabCase",
				title: "Kebab Case",
				match: "Kebab Case Transforms by separating words with dash symbol (-) instead of a space",
				description: "Transforms by separating words with dash symbol (-) instead of a space",
				autocomplete: ["Kebab", "Case"],
			},
			{
				id: "co.ameba.Esse.CaseFunctions.lowerCase",
				title: "Lowercase",
				match: "Lowercase Returns a version of the text with all letters converted to lowercase",
				description: "Returns a version of the text with all letters converted to lowercase",
				autocomplete: ["Lowercase"],
			},
			{
				id: "co.ameba.Esse.CaseFunctions.paskalCase",
				title: "Pascal Case",
				match: "Pascal Case Transforms by concatenating capitalized words",
				description: "Transforms by concatenating capitalized words",
				autocomplete: ["Pascal", "Case"],
			},
			{
				id: "co.ameba.Esse.CaseFunctions.randomCase",
				title: "RaNdOm CasE",
				match: "RaNdOm CasE Transforms by RaNdOmLy applying uppercase or lowercase to each character",
				description: "Transforms by RaNdOmLy applying uppercase or lowercase to each character",
				autocomplete: ["RaNdOm", "CasE"],
			},
			{
				id: "co.ameba.Esse.CaseFunctions.sentenceCase",
				title: "Sentence Case",
				match: "Sentence Case Replaces the first character in each sentence to its corresponding uppercase value",
				description: "Replaces the first character in each sentence to its corresponding uppercase value",
				autocomplete: ["Sentence", "Case"],
			},
			{
				id: "co.ameba.Esse.CaseFunctions.snakeCase",
				title: "Snake Case",
				match: "Snake Case Transforms by separating words with underscore symbol (_) instead of a space",
				description: "Transforms by separating words with underscore symbol (_) instead of a space",
				autocomplete: ["Snake", "Case"],
			},
			{
				id: "co.ameba.Esse.CaseFunctions.upperCase",
				title: "Uppercase",
				match: "Uppercase Returns a version of the text with all letters converted to uppercase",
				description: "Returns a version of the text with all letters converted to uppercase",
				autocomplete: ["Uppercase"],
			},
		],
		category: "Case",
	},
	{
		items: [
			{
				id: "co.ameba.Esse.CleaningFunctions.removeDuplicateLines",
				title: "Remove Duplicate Lines",
				match: "Remove Duplicate Lines Removes duplicate lines",
				description: "Removes duplicate lines",
				autocomplete: ["Remove", "Duplicate", "Lines"],
			},
			{
				id: "co.ameba.Esse.CleaningFunctions.removeEmptyLines",
				title: "Remove Empty Lines",
				match: "Remove Empty Lines Removes all empty lines from text",
				description: "Removes all empty lines from text",
				autocomplete: ["Remove", "Empty", "Lines"],
			},
			{
				id: "co.ameba.Esse.CleaningFunctions.removeLineNumbers",
				title: "Remove Line Numbers",
				match: "Remove Line Numbers Removes line numbers from a numbered list",
				description: "Removes line numbers from a numbered list",
				autocomplete: ["Remove", "Line", "Numbers"],
			},
			{
				id: "co.ameba.Esse.CleaningFunctions.removeNewLines",
				title: "Remove New Lines",
				match: "Remove New Lines Removes new lines, merging all in, separated by a space",
				description: "Removes new lines, merging all in, separated by a space",
				autocomplete: ["Remove", "New", "Lines"],
			},
			{
				id: "co.ameba.Esse.CleaningFunctions.removeQuotePrefixes",
				title: "Remove Quote Prefixes",
				match: "Remove Quote Prefixes Cleans quotes marks(>>) from the beginning of each line in text",
				description: "Cleans quotes marks(>>) from the beginning of each line in text",
				autocomplete: ["Remove", "Quote", "Prefixes"],
			},
			{
				id: "co.ameba.Esse.CleaningFunctions.collapseWhitespace",
				title: "Remove White Space",
				match: "Remove White Space Truncates empty space, including empty lines, tabs and multiple spaces",
				description: "Truncates empty space, including empty lines, tabs and multiple spaces",
				autocomplete: ["Remove", "White", "Space"],
			},
			{
				id: "co.ameba.Esse.CleaningFunctions.removeDigitCharacters",
				title: "Strip Numeric Characters",
				match: "Strip Numeric Characters Removes all numeric characters",
				description: "Removes all numeric characters",
				autocomplete: ["Strip", "Numeric", "Characters"],
			},
			{
				id: "co.ameba.Esse.CleaningFunctions.removeNonAlphaNumericCharacters",
				title: "Strip non Alphanumeric Characters",
				match:
					"Strip non Alphanumeric Characters Removes all non alphanumeric characters, spaces and new lines stay in place",
				description: "Removes all non alphanumeric characters, spaces and new lines stay in place",
				autocomplete: ["Strip", "non", "Alphanumeric", "Characters"],
			},
			{
				id: "co.ameba.Esse.CleaningFunctions.removeNonAlphaNumericCharactersPlus",
				title: "Strip non Alphanumeric Characters Plus",
				match:
					"Strip non Alphanumeric Characters Plus Removes all non alphanumeric characters, spaces, new lines and punctuation stay in place",
				description: "Removes all non alphanumeric characters, spaces, new lines and punctuation stay in place",
				autocomplete: ["Strip", "non", "Alphanumeric", "Characters", "Plus"],
			},
			{
				id: "co.ameba.Esse.CleaningFunctions.removeNonDigitCharacters",
				title: "Strip non Numeric Characters",
				match: "Strip non Numeric Characters Removes all non numeric characters",
				description: "Removes all non numeric characters",
				autocomplete: ["Strip", "non", "Numeric", "Characters"],
			},
			{
				id: "co.ameba.Esse.CleaningFunctions.removeSpaces",
				title: "Truncate Spaces",
				match: "Truncate Spaces Removes empty space in the beginning and end of the text",
				description: "Removes empty space in the beginning and end of the text",
				autocomplete: ["Truncate", "Spaces"],
			},
		],
		category: "Cleaning",
	},
	{
		items: [
			{
				id: "co.ameba.Esse.ConvertFunctions.decreaseIndent",
				title: "Decrease Indent",
				match: "Decrease Indent Removes tab in the beginning of each line, decreasing indentation",
				description: "Removes tab in the beginning of each line, decreasing indentation",
				autocomplete: ["Decrease", "Indent"],
			},
			{
				id: "co.ameba.Esse.ConvertFunctions.increaseIndent",
				title: "Increase Indent",
				match: "Increase Indent Adds tab in the beginning of each line, increasing indentation",
				description: "Adds tab in the beginning of each line, increasing indentation",
				autocomplete: ["Increase", "Indent"],
			},
			{
				id: "co.ameba.Esse.ConvertFunctions.shuffleSentences",
				title: "Shuffle Sentences",
				match: "Shuffle Sentences Randomly shuffles sentences",
				description: "Randomly shuffles sentences",
				autocomplete: ["Shuffle", "Sentences"],
			},
			{
				id: "co.ameba.Esse.ConvertFunctions.shuffleWords",
				title: "Shuffle Words",
				match: "Shuffle Words Randomly shuffles words",
				description: "Randomly shuffles words",
				autocomplete: ["Shuffle", "Words"],
			},
			{
				id: "co.ameba.Esse.ConvertFunctions.sortLinesAscending",
				title: "Sort Lines Ascending",
				match: "Sort Lines Ascending Sorts lines in accessing order",
				description: "Sorts lines in accessing order",
				autocomplete: ["Sort", "Lines", "Ascending"],
			},
			{
				id: "co.ameba.Esse.ConvertFunctions.sortLinesDescending",
				title: "Sort Lines Descending",
				match: "Sort Lines Descending Sorts lines in descending order",
				description: "Sorts lines in descending order",
				autocomplete: ["Sort", "Lines", "Descending"],
			},
			{
				id: "co.ameba.Esse.ConvertFunctions.spellOutNumbers",
				title: "Spell Out Numbers",
				match: "Spell Out Numbers Converts all numbers into words, i.e. 9 ->'nine', 22 -> 'twenty two', etc.",
				description: "Converts all numbers into words, i.e. 9 ->'nine', 22 -> 'twenty two', etc.",
				autocomplete: ["Spell", "Out", "Numbers"],
			},
		],
		category: "Convert",
	},
	{
		items: [
			{
				id: "co.ameba.Esse.ConvertFunctions.base64",
				title: "Base64",
				match: "Base64 ",
				description: "",
				autocomplete: ["Base64"],
			},
			{
				id: "co.ameba.Esse.ConvertFunctions.htmlToPlainText",
				title: "HTML to Plain Text",
				match: "HTML to Plain Text Converts provided HTML code to plain text",
				description: "Converts provided HTML code to plain text",
				autocomplete: ["HTML", "to", "Plain", "Text"],
			},
			{ id: "co.ameba.Esse.ConvertFunctions.md5", title: "MD5", match: "MD5 ", description: "", autocomplete: ["MD5"] },
			{
				id: "co.ameba.Esse.OtherFunctions.minifyJSON",
				title: "Minify JSON",
				match: "Minify JSON Returns a minimized version of JSON, everething is in one string",
				description: "Returns a minimized version of JSON, everething is in one string",
				autocomplete: ["Minify", "JSON"],
			},
			{
				id: "co.ameba.Esse.OtherFunctions.prettyJSON",
				title: "Prettify JSON",
				match: "Prettify JSON Returns nicely formatted JSON. Returns nothing if input text is not valid JSON",
				description: "Returns nicely formatted JSON. Returns nothing if input text is not valid JSON",
				autocomplete: ["Prettify", "JSON"],
			},
			{
				id: "co.ameba.Esse.OtherFunctions.prettySortedJSON",
				title: "Prettify and Sort JSON",
				match:
					"Prettify and Sort JSON Returns nicely formatted and sorted JSON. Returns nothing if input text is not valid JSON",
				description: "Returns nicely formatted and sorted JSON. Returns nothing if input text is not valid JSON",
				autocomplete: ["Prettify", "and", "Sort", "JSON"],
			},
			{
				id: "co.ameba.Esse.ConvertFunctions.sha256",
				title: "SHA-256",
				match: "SHA-256 ",
				description: "",
				autocomplete: ["SHA-256"],
			},
			{
				id: "co.ameba.Esse.ConvertFunctions.sha384",
				title: "SHA-384",
				match: "SHA-384 ",
				description: "",
				autocomplete: ["SHA-384"],
			},
			{
				id: "co.ameba.Esse.ConvertFunctions.sha512",
				title: "SHA-512",
				match: "SHA-512 ",
				description: "",
				autocomplete: ["SHA-512"],
			},
			{
				id: "co.ameba.Esse.ConvertFunctions.urlDecoded",
				title: "URL Decoded",
				match: "URL Decoded ",
				description: "",
				autocomplete: ["URL", "Decoded"],
			},
			{
				id: "co.ameba.Esse.ConvertFunctions.urlEncoded",
				title: "URL Encoded",
				match: "URL Encoded ",
				description: "",
				autocomplete: ["URL", "Encoded"],
			},
		],
		category: "Developer",
	},
	{
		items: [
			{
				id: "co.ameba.Esse.ExtractFunctions.extractAddress",
				title: "Extract Address",
				match: "Extract Address Extracts addresses from given text, outputs one date per line.",
				description: "Extracts addresses from given text, outputs one date per line.",
				autocomplete: ["Extract", "Address"],
			},
			{
				id: "co.ameba.Esse.ExtractFunctions.extractDate",
				title: "Extract Dates",
				match: "Extract Dates Extracts dates from given text, outputs one date per line.",
				description: "Extracts dates from given text, outputs one date per line.",
				autocomplete: ["Extract", "Dates"],
			},
			{
				id: "co.ameba.Esse.ExtractFunctions.extractEmail",
				title: "Extract Emails",
				match: "Extract Emails Extracts emails from given text, outputs one email per line.",
				description: "Extracts emails from given text, outputs one email per line.",
				autocomplete: ["Extract", "Emails"],
			},
			{
				id: "co.ameba.Esse.ExtractFunctions.extractPhone",
				title: "Extract Phone Numbers",
				match: "Extract Phone Numbers Extracts phone numbers from given text, outputs one phone per line.",
				description: "Extracts phone numbers from given text, outputs one phone per line.",
				autocomplete: ["Extract", "Phone", "Numbers"],
			},
			{
				id: "co.ameba.Esse.ExtractFunctions.extractURL",
				title: "Extract URLs",
				match: "Extract URLs Extracts URLs from given text, outputs one URL per line.",
				description: "Extracts URLs from given text, outputs one URL per line.",
				autocomplete: ["Extract", "URLs"],
			},
		],
		category: "Extract",
	},
	{
		items: [
			{
				id: "co.ameba.Esse.OtherFunctions.circleLetters",
				title: "Circle Letters: Empty",
				match: "Circle Letters: Empty All letters are placed in ⓔⓜⓟⓣⓨ circles",
				description: "All letters are placed in ⓔⓜⓟⓣⓨ circles",
				autocomplete: ["Circle", "Letters:", "Empty"],
			},
			{
				id: "co.ameba.Esse.OtherFunctions.circleLettersFilled",
				title: "Circle Letters: Filled",
				match: "Circle Letters: Filled All letters are placed in filled circles",
				description: "All letters are placed in filled circles",
				autocomplete: ["Circle", "Letters:", "Filled"],
			},
			{
				id: "co.ameba.Esse.OtherFunctions.uniqueWords",
				title: "Count Unique Words",
				match: "Count Unique Words Counts unique words",
				description: "Counts unique words",
				autocomplete: ["Count", "Unique", "Words"],
			},
			{
				id: "co.ameba.Esse.OtherFunctions.hashTag",
				title: "Hashtags",
				match: "Hashtags Adds hash sign(#) to each word.",
				description: "Adds hash sign(#) to each word.",
				autocomplete: ["Hashtags"],
			},
			{
				id: "co.ameba.Esse.OtherFunctions.addLineBulletStar",
				title: "List: Add Line Bullet (*)",
				match: "List: Add Line Bullet (*) Adds star(*) to each line",
				description: "Adds star(*) to each line",
				autocomplete: ["List:", "Add", "Line", "Bullet", "(*)"],
			},
			{
				id: "co.ameba.Esse.OtherFunctions.addLineBulletDash",
				title: "List: Add Line Bullet (-)",
				match: "List: Add Line Bullet (-) Adds dash(-) to each line",
				description: "Adds dash(-) to each line",
				autocomplete: ["List:", "Add", "Line", "Bullet", "(-)"],
			},
			{
				id: "co.ameba.Esse.OtherFunctions.addLineNumbers",
				title: "List: Add Line Numbers (1 2 3)",
				match: "List: Add Line Numbers (1 2 3) Numbers each line",
				description: "Numbers each line",
				autocomplete: ["List:", "Add", "Line", "Numbers", "(1", "2", "3)"],
			},
			{
				id: "co.ameba.Esse.OtherFunctions.addLineNumbersParentheses",
				title: "List: Add Line Numbers (1) 2) 3))",
				match: "List: Add Line Numbers (1) 2) 3)) Numbers each line, numbers followed by parentheses",
				description: "Numbers each line, numbers followed by parentheses",
				autocomplete: ["List:", "Add", "Line", "Numbers", "(1)", "2)", "3))"],
			},
			{
				id: "co.ameba.Esse.OtherFunctions.addLineNumbersDot",
				title: "List: Add Line Numbers (1. 2. 3.)",
				match: "List: Add Line Numbers (1. 2. 3.) Numbers each line, numbers followed by dot",
				description: "Numbers each line, numbers followed by dot",
				autocomplete: ["List:", "Add", "Line", "Numbers", "(1.", "2.", "3.)"],
			},
			{
				id: "co.ameba.Esse.OtherFunctions.rot13",
				title: "ROT13",
				match:
					"ROT13 ROT13 is a simple letter substitution cipher that replaces a letter with the 13th letter after it, in the alphabet",
				description:
					"ROT13 is a simple letter substitution cipher that replaces a letter with the 13th letter after it, in the alphabet",
				autocomplete: ["ROT13"],
			},
			{
				id: "co.ameba.Esse.OtherFunctions.reversed",
				title: "Reversed",
				match: "Reversed Returns input in reversed order.",
				description: "Returns input in reversed order.",
				autocomplete: ["Reversed"],
			},
			{
				id: "co.ameba.Esse.OtherFunctions.squareLetters",
				title: "Square Letters",
				match: "Square Letters All letters are placed in squares",
				description: "All letters are placed in squares",
				autocomplete: ["Square", "Letters"],
			},
			{
				id: "co.ameba.Esse.OtherFunctions.textStatistics",
				title: "Text Stats",
				match: "Text Stats Returns basic statistics for provided text",
				description: "Returns basic statistics for provided text",
				autocomplete: ["Text", "Stats"],
			},
			{
				id: "co.ameba.Esse.OtherFunctions.upsideDown",
				title: "Upside Down",
				match: "Upside Down Transform text to upside down -> ʇxǝʇ",
				description: "Transform text to upside down -> ʇxǝʇ",
				autocomplete: ["Upside", "Down"],
			},
		],
		category: "Other",
	},
	{
		items: [
			{
				id: "co.ameba.Esse.QuotationMarksFunctions.CJKQuotes",
				title: "CJK Quotes",
				match: "CJK Quotes Replace all quotes with CJK Brackets",
				description: "Replace all quotes with CJK Brackets",
				autocomplete: ["CJK", "Quotes"],
			},
			{
				id: "co.ameba.Esse.QuotationMarksFunctions.angleQuotes",
				title: "Curly Quotes",
				match: "Curly Quotes Replace all quotes with Curly(Citation) quotes",
				description: "Replace all quotes with Curly(Citation) quotes",
				autocomplete: ["Curly", "Quotes"],
			},
			{
				id: "co.ameba.Esse.QuotationMarksFunctions.doubleToSingleQuotes",
				title: "Double to Single Quotes",
				match: "Double to Single Quotes Replace all double quotes with single quotes",
				description: "Replace all double quotes with single quotes",
				autocomplete: ["Double", "to", "Single", "Quotes"],
			},
			{
				id: "co.ameba.Esse.QuotationMarksFunctions.curvedQuotes",
				title: "Guillemet Quotes",
				match: "Guillemet Quotes Replace all quotes with Guillemet(Angle) quotes",
				description: "Replace all quotes with Guillemet(Angle) quotes",
				autocomplete: ["Guillemet", "Quotes"],
			},
			{
				id: "co.ameba.Esse.QuotationMarksFunctions.singleToDoubleQuotes",
				title: "Single to Double Quotes",
				match: "Single to Double Quotes Replace all single quotes with double quotes",
				description: "Replace all single quotes with double quotes",
				autocomplete: ["Single", "to", "Double", "Quotes"],
			},
			{
				id: "co.ameba.Esse.QuotationMarksFunctions.striaghtQuotes",
				title: "Straight Quotes",
				match: "Straight Quotes Replace all quotes with Straight quotes",
				description: "Replace all quotes with Straight quotes",
				autocomplete: ["Straight", "Quotes"],
			},
			{
				id: "co.ameba.Esse.QuotationMarksFunctions.removeSentenceQuotes",
				title: "Unquote Sentence",
				match: "Unquote Sentence Unquotes sentence, ignores quotes within the sentence.",
				description: "Unquotes sentence, ignores quotes within the sentence.",
				autocomplete: ["Unquote", "Sentence"],
			},
			{
				id: "co.ameba.Esse.QuotationMarksFunctions.wrapParagraphInQuotes",
				title: "Wrap Paragraph in Quotes",
				match:
					"Wrap Paragraph in Quotes Wraps each paragraph in provided text in quotes, replacing all existing double quotes with single quotes",
				description:
					"Wraps each paragraph in provided text in quotes, replacing all existing double quotes with single quotes",
				autocomplete: ["Wrap", "Paragraph", "in", "Quotes"],
			},
			{
				id: "co.ameba.Esse.QuotationMarksFunctions.smartWrapInQuotes",
				title: "Wrap in Quotes",
				match: "Wrap in Quotes Wraps provided text in quotes, replacing all existing double quotes with single quotes",
				description: "Wraps provided text in quotes, replacing all existing double quotes with single quotes",
				autocomplete: ["Wrap", "in", "Quotes"],
			},
		],
		category: "QuotationMarks",
	},
];
