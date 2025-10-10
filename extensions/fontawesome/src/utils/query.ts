//GraphQL Query to fetch icons for a specific style
export const iconQuery = (squery: string, stype: string) => `query Search {
    search(query:"${squery}", version: "6.7.2", first: 48) {
        id
        unicode
        svgs(filter: { familyStyles: [
          { family: ${
            stype.split(" ").length === 3
              ? stype.split(", ")[0].replace(" ", "_").toUpperCase()
              : stype.split(", ")[0].toUpperCase()
          }, style: ${stype.split(", ")[1].toUpperCase()} }
          { family: CLASSIC, style: BRANDS }
        ] }) {
            html
            familyStyle{
              prefix
            }
        }
    }
  }
`;
