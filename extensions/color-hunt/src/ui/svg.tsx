import { eachHex } from "../utils/util";
import { usePromise } from "@raycast/utils";
import satori from "satori";
import fs from "fs";
import { environment } from "@raycast/api";

export const Svg = ({ id, show }: { show: boolean; id: string }) => {
  const display = show ? "flex" : "none";
  if (id.length !== 24) {
    throw new Error("Invalid id");
  }
  // step 6
  const hexes = eachHex(id);
  const flex = [5, 4, 3, 2];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      {flex.map((item) => {
        const hex = hexes.next().value!;
        return (
          <div
            key={hex}
            style={{
              backgroundColor: `#${hex}`,
              flex: item,
              display: "flex",
            }}
          >
            <span
              style={{
                display,
                position: "absolute",
                bottom: 0,
                backgroundColor: "grey",
                color: `#fff`,
                padding: `4px 6px`,
                borderRadius: "0 6px 0 0",
                overflow: "hidden",
                letterSpacing: "1px",
                fontSize: `14px`,
                width: `80px`,
                height: `25px`,
              }}
            >
              #{hex}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const fontData = fs.readFileSync(environment.assetsPath + "/Roboto-Regular.ttf");

export class Svgs {
  public static async core(id: string, show: boolean, width: number, height: number) {
    const key = `${id}_${show}_${width}_${height}`;
    const file = environment.supportPath + `/palette/${key}.svg`;
    if (fs.existsSync(file)) {
      return file;
    }

    // const {resourceLimits} = await import('node:worker_threads')
    // console.log(resourceLimits)
    // console.log(process.memoryUsage.rss() / 1_048_576)

    //  1024 * 1024
    if (process.memoryUsage().heapUsed / 1_048_576 > 50) {
      // console.log("Memory usage is high, trying to free some memory");
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const graph = await satori(<Svg show={show} id={id} />, {
      width: width,
      height: height,
      fonts: [
        {
          name: "Roboto",
          data: fontData,
          weight: 400,
          style: "normal",
        },
      ],
    });

    fs.writeFileSync(file, graph, "utf-8");
    return file;
  }

  public static generate(w: number, h: number) {
    return (id: string, show: boolean) => usePromise((id, show, w, h) => Svgs.core(id, show, w, h), [id, show, w, h]);
  }

  public static default() {
    return (id: string, show: boolean) => this.core(id, show, 189, 336);
  }

  public static detail() {
    return this.generate(475, 350);
  }
}
