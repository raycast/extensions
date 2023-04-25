import fs from "fs";
import path from "path";

import Docxtemplater from "docxtemplater";
import { ImageModule } from "docxtemplater-image-module-free";
import PizZip from "pizzip";

export interface VecationData {
    name: string;
    position: string;
    reason: string;
    start_year: number;
    start_month: number;
    start_day: number;
    end_year: number;
    end_month: number;
    end_day: number;
    period: number;
    phone_number: string;
    submit_year: number;
    submit_month: number;
    submit_day: number;
    image: string;
}
const opts = {
    centered: false,
    fileType: "docx",
    getImage: function (tagValue: string) {
        return fs.readFileSync(tagValue);
    },
    getSize: function () {
        return [32, 32];
    },
};

export function loadTamplate(): string {
    const content = fs.readFileSync(
        path.resolve(__dirname, "assets", "휴가신청서_2023.docx"),
        "binary"
    );
    return content;
}

export function fillin(content: string, v: VecationData, dir: string) {
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [new ImageModule(opts)],
    });
    doc.render(v);
    const buf = doc.getZip().generate({
        type: "nodebuffer",
        // compression: DEFLATE adds a compression step.
        // For a 50MB output document, expect 500ms additional CPU time
        compression: "DEFLATE",
    });

    // buf is a nodejs Buffer, you can either write it to a
    // file or res.send it with express for example.
    fs.writeFileSync(path.resolve(dir, "output.docx"), buf);
}
