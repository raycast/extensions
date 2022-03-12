import {Project, RecentProduct} from "../interfaces";
import {getRecentProduct} from "./recentProduct";
import {setLocalStorageItem} from "@raycast/api";

const recentProductSize = 4;

export function recentProjectSetting(project: Project, command: string, productName: string, displayName: string) {
    project.duplication = false;
    getRecentProduct().then(data => {
        const recentProducts: RecentProduct[] = []
        if (data === undefined) {
            const recentProduct: RecentProduct = {
                project: project,
                command: command,
                productName: productName,
                displayName: displayName,
                timestamp: Date.now(),
                score: 0
            }
            recentProducts.push(recentProduct)
            setLocalStorageItem("recentProduct", JSON.stringify(recentProducts))
        } else {
            getRecentProduct().then(data => {
                let recentProducts: RecentProduct[] = data
                let exist = false;
                if (recentProducts instanceof Array) {
                    recentProducts.map((recentProduct => {
                        recentProduct.project.timestamp = Date.now();
                        if (recentProduct.project.path === project.path) {
                            recentProduct.score = recentProduct.score + 1;
                            exist = true;
                        }
                    }));
                    recentProducts = recentProducts.sort((item1, item2) => {
                        return (item2.score - item1.score) && (item2.timestamp as number - item1.timestamp as number)
                    });
                    if (recentProducts.length >= recentProductSize) {
                        recentProducts.pop();
                    }
                    if (!exist) {
                        project.duplication = false;
                        const recentProduct: RecentProduct = {
                            project: project,
                            command: command,
                            productName: productName,
                            displayName: displayName,
                            timestamp: Date.now(),
                            score: 0
                        }
                        recentProducts.push(recentProduct)
                    }
                    setLocalStorageItem("recentProduct", JSON.stringify(recentProducts))
                }
            })
        }

    });
}