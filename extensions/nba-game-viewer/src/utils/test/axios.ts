export const requests: Array<{ url: string; dates: string }> = [];

const axios = {
  get: async (url: string, { params }: { params: { dates: string } }) => {
    requests.push({ url, dates: params.dates });
    return { data: { events: [params.dates] } };
  },
};

export default axios;
