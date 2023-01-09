function LeftPad(number: number, targetLength: number) {
    var output = number + '';
    while (output.length < targetLength) {
        output = '0' + output;
    }
    return output;
}

export default function GetTime() {
    let date = new Date();
    return LeftPad(date.getHours(), 2) + ':' + LeftPad(date.getMinutes(), 2) + ':' + LeftPad(date.getSeconds(), 2);
}