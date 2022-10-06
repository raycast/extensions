import { exec } from "child_process";
import { promisify } from "util";
import { inspect } from "util";
import { getCliPath } from "./cli";

import _ from "lodash";


const execp = promisify(exec);
const expressoExecutable: string = getCliPath();

export function parseAlfredSubtitle(subtitle: string) {
    interface SubtitleData {
        region: string;
        country: string;
        keywords: string[];
        is_favorite: boolean;
        is_recent: boolean;
        is_recommended: boolean;
        is_connected: boolean;
    }
    let subtitleData: SubtitleData = {
        region: 'Unknown',
        country: 'Unknown',
        keywords: [],
        is_favorite: false,
        is_recent: false,
        is_recommended: false,
        is_connected: false,
    }

    // Remove the recommended emoji as it is not applied to
    // all recommended VPNs.
    subtitle = subtitle.replace('\ud83d\udc4d', '');

    // Check if the first character is an emoji
    // 🕙 Americas - United States
    switch (subtitle.substring(0, 2)) {
        case '\u2764\ufe0f':
            subtitleData.is_favorite = true;
            subtitleData.keywords.push("favorite");
            subtitle = subtitle.substring(2).trim();
            break;

        case '\ud83d\udd59':
            subtitleData.is_recent = true;
            subtitleData.keywords.push("recent");
            subtitle = subtitle.substring(2).trim();
            break;

        case '\ud83d\udc4d':
            subtitleData.is_recommended = true;
            subtitle = subtitle.substring(2).trim();
            break;

        case '\u26a1\ufe0f':
            subtitleData.is_connected = true;
            subtitle = subtitle.substring(2).trim();
            break;
    }

    const subtitleSplit = subtitle.split(" - ");
    subtitleData.region = subtitleSplit[0];
    subtitleData.country = subtitleSplit[1];
    subtitleData.keywords.push(subtitleData.region, subtitleData.country);

    return subtitleData;
}

function processAlfredLocations(locations: any[]): any[] {
    let processedLocations = [];

    for (var location of locations) {
        const parsedSub = parseAlfredSubtitle(location.subtitle);
        const processedLocation = { ...location, ...parsedSub };

        if ("uid" in processedLocation === false) {
            const regexp = /connect \-\-change (\d+)/g;
            const matches = [...processedLocation.arg.matchAll(regexp)].map(
                r => r[1]
            );
            const uid = matches[0];
            processedLocation["uid"] = uid;
        }

        processedLocations.push(processedLocation);
    }

    return processedLocations;
}

export async function runExpressoAlfred(): Promise<any> {
    const output = await execp(`"${expressoExecutable}" alfred`);
    const outputJSON = JSON.parse(output.stdout);

    interface AlfredData {
        status: any;
        favorites: any[];
    }
    let alfredData: AlfredData = {
        status: {
            status: false,
            status_text: "Not Connected",
            status_detail: undefined,
            last_used: undefined,
        },
        favorites: [],
    };

    if (outputJSON.items[0].arg == "disconnect") {
        alfredData.status.status = true;
        alfredData.status.status_text = "Connected:";
        alfredData.status.status_detail = outputJSON.items[0].title;
        outputJSON.items.shift();
    }
    alfredData.favorites = processAlfredLocations(outputJSON.items);

    for (var favorite of alfredData.favorites) {

        if (favorite["is_recent"] == true) {
            alfredData.status.last_used = favorite;
            break;
        }
    }

    return alfredData;
}

export async function runExpressoAlfredLocations(): Promise<any> {
    const output = await execp(`"${expressoExecutable}" alfred --locations`);
    const outputJSON = JSON.parse(output.stdout);

    const locations = processAlfredLocations(outputJSON.items);
    const locationsGrouped = _.groupBy(locations, location => location.region);

    return locationsGrouped;
}

export async function runExpressoDisconnect(): Promise<any> {
    const output = await execp(`"${expressoExecutable}" disconnect`);

    console.log("Ran expresso disconnect: " + output.stdout);
}

export async function runExpressoConnect(uid: number): Promise<any> {
    const output = await execp(
        `"${expressoExecutable}" connect --change ${uid}`,

        // TODO: Does not seem to work
        { timeout: 120 * 1000},
    );

    console.log("Ran expresso connect: " + output.stdout);

    return output.stdout;
}


export async function getExpressoInfo(): Promise<any> {
    console.log("In expresso info...");
    let expressoInfo = {
        error: undefined,
        status: undefined,
        favorites: [],
        locations: [],
    };

    try {

        const alfredData = await runExpressoAlfred();
        const locationsGrouped = await runExpressoAlfredLocations();

        expressoInfo = { ...expressoInfo, ...alfredData };
        expressoInfo.locations = locationsGrouped;

    } catch (err: any) {
        console.log("Could not get info: ${err.message}")
        expressoInfo.error = err.message;
    }

    return expressoInfo;
}
