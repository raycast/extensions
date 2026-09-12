export default class WiggleMaker {
  static eases: any;
  constructor() {
    WiggleMaker.eases = {
      linear: (x: number) => x,
      sine: (x: number) => -(Math.cos(Math.PI * x) - 1) / 2,
      quadratic: (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
      cubic: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
      exponential: function (x: number) {
        return x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
      },
      quartOut: (x: number) => 1 - Math.pow(1 - x, 4),
      quartIn: (x: number) => x * x * x * x,
    };
  }
  static generateSpacesArray(height: number, width: number, ease: string): string[] {
    const res: string[] = [];
    let eased: number;
    for (let i = 0; i < height; i++) {
      eased = WiggleMaker.eases[ease](Math.abs(i / height)) * width;
      res.push(eased.toFixed(1));
    }
    const len = res.length;
    for (let j = 0; j < len; j++) {
      res.push(res[Math.abs(len - j) - 1]);
    }
    const finalres = [];
    for (let k = 0; k < res.length; k++) {
      let topush = "";
      for (let l = 0; l < +res[k]; l++) {
        topush += " ";
      }
      finalres.push(topush);
    }
    return finalres;
  }
  generateWiggle(height: number, width: number, text: string, ease: string) {
    const arr = WiggleMaker.generateSpacesArray(height, width, ease);
    let res = ``;
    for (let i = 0; i < arr.length; i++) {
      res += arr[i] + text + "\n";
    }
    return res;
  }
}
