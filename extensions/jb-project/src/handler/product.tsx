import {Config, InstallProduct, Product, Project, SupportProduct} from "../interfaces";
import {getLocalStorageItem, randomId, setLocalStorageItem, showToast, ToastStyle,clearLocalStorage} from "@raycast/api";
import lastDirName from "./filename";
import {isNotEmpty} from "./readTxt";
import fs, {PathLike} from "fs";
import parsingProductConfig from "./xmlHandler";
import {clearAndRestoreRecentProduct} from "./recentProduct";

export async function initProduct(config: Config, supportProduct: SupportProduct[]) {
    const installProdNames = await analysisInstalledProductDirNames(config);

    const products: Product[] = [];
    let items: Project[] = [];

    if (installProdNames.length == 0) {
        await clearLocalStorage();
        await showToast(ToastStyle.Failure, "Not install JetBrains IDEs.")
        return products;
    }
    installProdNames.map(name => {
        let fullPath = config.configPath.basePath + name.productName + config.configPath.middlePath + config.configPath.fileName;
        if (name.productName.includes("Rider")) {
            fullPath = config.configPath.basePath + name.productName + config.configPath.middlePath + "/recentSolutions.xml";
        }
        if (fs.existsSync(fullPath)) {
            items = parsingProductConfig(fullPath);
            supportProduct.map(product => {
                if (name.productName.includes(product.productName)) {
                    const proj = {
                        key: randomId(),
                        project: items,
                        command: product.command,
                        productName: name.productName,
                        displayName: product.productName,
                        score: name.score === undefined ? 0 : name.score
                    }
                    products.push(proj);
                }
            })
        }
    })
    products.sort((product1, product2) => {
            return product2.score - product1.score;
    })
    // Handler not exists product project to remove
    getProductScore().then(data => {
        installProdNames.map(storeItem => {
            if (!data.get(storeItem.productName)) {
                // Remove
                data.delete(storeItem.productName)
                const obj = Array.from(data).reduce((obj, [key, value]) => (
                    Object.assign(obj, {[key]: value}) // Be careful! Maps can have non-String keys; object literals can't.
                ), {});
                setLocalStorageItem("productScore", JSON.stringify(obj))
            }
        })
    })
    return products
}

export async function analysisInstalledProductDirNames(config: Config) {
    const storeProducts: Map<string, number> = await getProductScore();
    const productDirNames: InstallProduct[] = []
    queryInstallProduct(config.configPath.basePath, ((err, files) => {
        if (err) {
            console.log(err)
        } else {
            config.supportProduct.map(prod => {
                files.map(file => {
                    if (file.includes(prod.productName)) {
                        const appPath = `/Applications/${prod.appName}`;
                        if (fs.existsSync(appPath)) {
                            const dirName = lastDirName(file);
                            if (isNotEmpty(dirName)) {
                                const installProduct: InstallProduct = {
                                    productName: dirName,
                                    score: storeProducts.size > 0 ? storeProducts.get(dirName) as number : 0
                                }
                                productDirNames.push(installProduct);
                            }
                        } else {
                            // Clear recent project
                            clearAndRestoreRecentProduct(lastDirName(file));
                        }
                    }
                })
            })
        }
    }));
    return productDirNames;
}

export async function getProductScore() {
    const scoreProduct = await getLocalStorageItem("productScore");
    const storeProducts: Map<string, number> = new Map();

    if (scoreProduct != undefined) {
        const temp = JSON.parse(scoreProduct as string);
        for (const tempKey in temp) {
            storeProducts.set(tempKey, temp[tempKey]);
        }
    }
    return storeProducts;

}

export function queryInstallProduct(path: PathLike, callback: (err: NodeJS.ErrnoException | null, files: string[]) => void) {
    const dirs: string[] = [];
    fs.readdirSync(path).forEach((file) => {
        if (file !== ".DS_Store") {
            const filePath = path + file;
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                dirs.push(filePath);
            }
        }
    })
    callback(null, dirs)
}

