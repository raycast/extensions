export default (resp: Response | undefined): string => {
  if (!resp) {
    return "**No data**";
  }
  const { oficial, blue } = resp;

  return `
![Flags](headerImg.png)
## Official
  
- Buy: $${oficial.value_buy}
- Sell: $${oficial.value_sell}
- Average: $${oficial.value_avg}
  
## Blue
  
- Buy: $${blue.value_buy}
- Sell: $${blue.value_sell}
- Average: $${blue.value_avg}
    `;
};
