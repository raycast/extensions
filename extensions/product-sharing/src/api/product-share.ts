import fetch from "node-fetch";

type ProductResponse<T> = {
  status: T;
  error?: string;
};

const baseUrl = "https://evanlong.me";

// 添加产品分享数据
export const addServerProductShare = async (data: AddProduct) => {
  try {
    const res = await fetch(`${baseUrl}/api/product/create`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    const result = await res.json();
    return result as ProductResponse<201 | 400 | 500>;
  } catch (error) {
    throw new Error(`Failed to Submit product: ${(error as Error).message}`);
  }
};

// 检查是否存在相同的 url
export const checkServerProductShareUrl = async (url: string) => {
  try {
    const res = await fetch(`${baseUrl}/api/product/check?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    return data as ProductResponse<200 | 400 | 409>;
  } catch (error) {
    throw new Error(`Product already exists: ${(error as Error).message}`);
  }
};

// 获取所有产品
export async function getServerProductShares(keyword?: string) {
  try {
    const res = await fetch(`${baseUrl}/api/product/all${keyword ? `?keyword=${keyword}` : ""}`);
    const data = await res.json();
    return data as GetProduct[];
  } catch (error) {
    throw new Error(`Failed to fetch products: ${(error as Error).message}`);
  }
}

export async function deleteServerProductShare(productId: string): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}/api/product/delete&id=${productId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete product");
    }
  } catch (error) {
    throw new Error(`Failed to delete product: ${(error as Error).message}`);
  }
}

// 发布推文
export const publishProductShareTweet = async (url: string) => {
  try {
    const res = await fetch(`https://n8n.evanlong.me/webhook/7788e76a-c9f5-4031-aa79-24c6c212d263?url=${url}`, {
      method: "POST",
    });
    const result = await res.json();
    return result as ProductResponse<200 | 401 | 500>;
  } catch (error) {
    throw new Error(`Failed to publish tweet: ${(error as Error).message}`);
  }
};

// 更新产品分享数据
export const updateServerProductShare = async (data: GetProduct) => {
  try {
    const res = await fetch(`${baseUrl}/api/product/edit`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    const result = await res.json();
    return result as ProductResponse<200 | 401 | 500>;
  } catch (error) {
    throw new Error(`Failed to update product share: ${(error as Error).message}`);
  }
};

// 搜索产品
export const searchServerProductShares = async (query: string) => {
  try {
    const res = await fetch(`${baseUrl}/api/product/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data as GetProduct[];
  } catch (error) {
    throw new Error(`Failed to search products: ${(error as Error).message}`);
  }
};
