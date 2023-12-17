
import { Detail } from "@raycast/api";
import { Clipboard,  getSelectedText } from "@raycast/api";
import { usePromise } from "@raycast/utils";

function convertHebrewKeyboardToEnglish(input: string): string {
    const hebrewToEnglishKeyboardMap: { [key: string]: string } = {
        'ק': 'e', 
        'ו': 'u',
        'א': 't',
        'ר': 'r',
        'ט': 'y',
        'י': 'h',
        'פ': 'p',
        'ש': 'a',
        'ד': 's',
        'ג': 'd',
        'כ': 'f',
        'ך': 'l',
        'ל': 'k',
        'ח': 'j',
        'ז': 'z',
        'ס': 'x',
        'ב': 'c',
        'ה': 'v',
        'נ': 'b',
        'מ': 'n',
        'צ': 'm',
        'ת': ',',
        'ץ': '.',
        'ף': ';',
        'ן': 'i',
        'ם': 'o',
        ',': '\'',
        '.': '/',
        '/': 'q',
        ';': '`',
        '׳': 'w',
        '[': '[',
        ']': ']',
        '\\': '\\',
        '`': '`',
        '~': '~',
        '!': '!',
        '@': '@',
        '#': '#',
        '$': '$',
        '%': '%',
        '^': '^',
        '&': '&',
        '*': '*',
        '(': '(',
        ')': ')',
        '_': '_',
        '+': '+',
        '{': '{',
        '}': '}',
        '|': '|',
        ':': ':',
        '"': "'",
        '<': '<',
        '>': '>',
        '?': '?',
        "שׁ":"A",
        "לֹ":"C",
        "„":"D",
        'ע':'g',
    };
  
    return input.split('').map(char => hebrewToEnglishKeyboardMap[char] || char).join('');
}

export default function Command() {
    console.log("Running Command");
    let markdown = '';
    const str = usePromise(
        async () => {
            const result = await getSelectedText()
            const converted = convertHebrewKeyboardToEnglish(result);

            console.log("str is: " + JSON.stringify(converted));
            const resText = converted;
            if (!resText){
                return <Detail markdown={``}/>;
            }

            markdown = `
            # Hebrish To English
            ${resText}
            `;

            const content1 = {
                text: resText ,
            }
            console.log("Copying " + JSON.stringify(content1));
            await Clipboard.copy(content1);
            // await showHUD(`✅ Copied to clipboard`);
            console.log("Pasting " + JSON.stringify(content1));
            await Clipboard.paste(content1);  
            return markdown;
        },
        [],
        {}
    );


    return <Detail markdown={str.data as string} />;
}