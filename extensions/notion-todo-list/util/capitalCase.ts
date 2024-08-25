export default function capitalCase(a: string): string {
    const words: string[] = a.split(" ")
    let newString: string[] = [];
    for (let word of words) {
        newString.push(word.charAt(0).toUpperCase() + word.slice(1))
    }
    return newString.join(" ")
}