import {environment, showHUD} from "@raycast/api";
import util from 'util';

const exec = util.promisify(require('child_process').exec);

const filePath = environment.assetsPath + "/" + Date.now() + ".png";
const command = "/usr/sbin/screencapture -i " + filePath
export default async function takeScreenshot() {
    await exec(command);
    return filePath;
}