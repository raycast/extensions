import {showHUD, LaunchProps} from "@raycast/api";
const {exec} = require("child_process");

interface Arguments {
    number: string;
}

export default async function main(props : LaunchProps < {
    arguments : Arguments;
} >) {
    let {number} = props.arguments;

    // Remove all non-numeric characters
    number = number.replace("/-/g", "");

    exec("open tel://" + number);

    await showHUD("Calling " + number);
}
