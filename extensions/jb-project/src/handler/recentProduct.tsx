import {getLocalStorageItem, setLocalStorageItem} from "@raycast/api";
import {RecentProduct} from "../interfaces";

export async function getRecentProduct() {
    const recentProductString = await getLocalStorageItem("recentProduct");
    let recentProduct: RecentProduct[] = [];
    if (recentProductString === undefined) {
        recentProduct = [];
    } else {
        recentProduct = JSON.parse(recentProductString as string) as RecentProduct[];
    }
    recentProduct = recentProduct.sort((item1, item2) => {
        if (item1.project.opened == item2.project.opened) {
            return 1;
        }
        return item2.score - item1.score;
    });
    return recentProduct;
}

export async function clearAndRestoreRecentProduct(clearProductName: string) {
    const recentProductString = await getLocalStorageItem("recentProduct");
    let recentProduct: RecentProduct[] = [];
    const storeRecentProduct: RecentProduct[] = [];
    if (!(recentProductString === undefined)) {
        recentProduct = JSON.parse(recentProductString as string) as RecentProduct[];
        if (recentProduct instanceof Array) {
            recentProduct.map(item => {
                if (!(item.productName === clearProductName)) {
                    storeRecentProduct.push(item);
                }
            });
        }
    }
    setLocalStorageItem("recentProduct", JSON.stringify(storeRecentProduct))


}
