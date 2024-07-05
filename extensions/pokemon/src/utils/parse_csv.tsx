import { createInterface } from 'readline';
import fs from 'fs';

// 读取本地csv配置文件成K-V键值对
export async function readCSVtoMapping(filePath: string): Promise<{[key: string]: string}> {
    const mapping: { [key: string]: string } = {};
    const fileStream = fs.createReadStream(filePath);   // 创建流
    // 创建 readline 接口
    const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity // 支持所有 CR LF 格式
    });

    // 逐行读取并添加到映射中
    rl.on('line', (line) => {
        const [key, value] = line.split(',');
        mapping[value.trim()] = key.trim();
    });

    return new Promise((resolve) => {
        rl.on('close', () => {
            resolve(mapping);
        });
    });
}