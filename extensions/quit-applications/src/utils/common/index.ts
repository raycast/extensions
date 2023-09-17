export function toBase64(text: string): string {
    return Buffer.from(text).toString("base64");
  }


export function clusterBy<T>(data: T[], count: number) {
    const result = [];
  
    for (let i = 0; i < data.length; i += count) {
      const item = data.slice(i, i + count);
      result.push(item);
    }
  
    return result;
  }
  
  export function mapArrayToObject<T, K>(
    data: T[][],
    keysInOrder: string[]
  ): K[] {
    return data.map((item) => {
      const itemObject = keysInOrder.map((key, index) => ({
        [key]: item[index],
      }));
  
      return Object.assign({}, ...itemObject);
    });
  }

  export function nullishFilter<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
  }