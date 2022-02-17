import {AliyunDrive,AliyunDriveClient} from "@chyroc/aliyundrive";

import { LocalStorage } from "@raycast/api";

interface Values {
    todo: string;
    priority: number;
}

export default async () => {
    const items = await LocalStorage.allItems<Values>();
    console.log(`Local storage item count: ${Object.entries(items).length}`);
};

export const cli = new AliyunDriveClient({

})