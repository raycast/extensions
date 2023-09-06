import { List } from "@raycast/api";

export default function Command() {
  const data = [
    {
      id: 1,
      type: "Joy",
      items: [
        "(⁠•⁠‿⁠•⁠)",
        "◉⁠‿⁠◉",
        "◕⁠‿⁠◕",
        "(⁠◔⁠‿⁠◔⁠)",
        "(.❛⁠ᴗ⁠❛.)",
        "(⁠θ⁠‿⁠θ⁠)",
        "ʘ⁠‿⁠ʘ",
        "(⁠✷⁠‿⁠✷⁠)",
        "(⁠◍⁠•⁠ᴗ⁠•⁠◍⁠)",
        "(⁠ʘ⁠ᴗ⁠ʘ⁠✿⁠)",
        "(⁠◠⁠‿⁠◕⁠)",
        "(⁠◠⁠‿⁠・⁠)⁠—⁠☆",
        "(⁠✿⁠^⁠‿⁠^)",
        "<(￣︶￣)>",
        "(＾◡＾)",
        "(⁠◜‿⁠◝⁠)",
        "(ノ^_^)ノ",
        "┏(＾0＾)┛",
        "(\\~‾▿‾)\\~",
        "└\\|∵\\|┐",
      ],
    },
    {
      type: "Surprise",
      items: ["(・o・)", "(⊙_⊙)", "＼(°o°)／", "(@_@)", "(●_●)", "(⁠‘⁠◉⁠⌓⁠◉⁠’⁠)", "(((;ꏿ_ꏿ;)))", "(ﾉﾟ0ﾟ)⁠ﾉ"],
    },
    {
      type: "Dissapproval",
      items: [
        "ಠ_ಠ",
        "ಠ⁠︵⁠ಠ",
        "ರ_ರ",
        "ಠಿ_ಠಿ",
        "ಠಿ_ಠ",
        "ಠ⁠﹏⁠ಠ",
        "(￣～￣)",
        "ಠ╭╮ಠ",
        "(¬､¬)",
        "(⩺_⩹)",
        "（＞д＜）",
        "⋋_⋌",
      ],
    },
    {
      type: "Indifference",
      items: [
        "(￢_￢)",
        "(¬_¬)",
        "(ー_ー)",
        "╮( ˘ ､ ˘ )╭",
        "¯\\\\_(⁠ツ⁠)\\_/⁠¯",
        "¯⁠\\\\(⁠◉⁠‿⁠◉⁠)/⁠¯",
        "¯⁠\\\\_( ͡⁠°⁠ ͜⁠ʖ⁠ ͡⁠°⁠)\\_/⁠¯",
        `¯\\\\_ʘ‿ʘ\\_/¯`,
      ],
    },
    {
      type: "Smug",
      items: ["ಠ⁠‿⁠ಠ", "(￢‿￢)", "ಠ‿↼", "( ͡° ͜ʖ ͡°)"],
    },
    {
      type: "Pain",
      items: [
        ">_<",
        "(×_×)",
        "(＋_＋)",
        "(ﾒ﹏ﾒ)",
        "[± _ ±]",
        "ಥ⁠‿⁠ಥ",
        "•́ ‿⁠⁠ •̀",
        "ಥ_ಥ",
        "(⁠╥⁠﹏⁠╥⁠)",
        "(T_T)	",
        "〜(＞＜)〜",
        "{{ (>_<) }}",
      ],
    },
    {
      type: "Confusion",
      items: [
        "(・_・;)",
        "(￣～￣;)",
        "(ーー;)",
        "(・・)?",
        "(-_-;)・・・",
        "(＠_＠)",
        "(o_O)",
        "(●__●)",
        "(☉_ ☉)",
        "ఠ _ ఠ",
        "(º～º)",
        "(?_?)",
      ],
    },
  ];

  return (
    <List isShowingDetail>
      {data.map((section, sectionIndex) => {
        const header = "| • | • | • | • |";
        const headerSeparator = "|:---:|:---:|:---:|:---:|";

        // generate table rows with four columns each from the items array
        const rows = section.items.reduce((acc: string[][], item: string, index: number) => {
          const rowIndex = Math.floor(index / 4);
          const columnIndex = index % 4;
          if (!acc[rowIndex]) {
            acc[rowIndex] = [];
          }
          acc[rowIndex][columnIndex] = item;
          return acc;
        }, []);

        // generate markdown table from rows
        const markdownRows = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");

        // blend it all together
        const markdown = `
${header}
${headerSeparator}
${markdownRows}
`;

        return <List.Item title={section.type} key={sectionIndex} detail={<List.Item.Detail markdown={markdown} />} />;
      })}
    </List>
  );
}
