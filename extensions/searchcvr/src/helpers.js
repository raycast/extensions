import { DOMParser } from 'xmldom';
import axios from 'axios';
const HTMLparser = require('dom-parser');

async function returnAccountingData(data) {
    let accountingLinksXML = [];

    data.forEach((element) => {
        accountingLinksXML.push({
                year: element._source.regnskab.regnskabsperiode.slutDato.substring(0, 4),
                document: element._source.dokumenter.find((el) => el.dokumentMimeType == "application/xml").dokumentUrl,
            }
        );
    });

    accountingLinksXML.sort((a, b) => {
        return a.year - b.year;
    });

    accountingLinksXML = accountingLinksXML.slice(-4);

    return accountingLinksXML;
}

async function returnXMLdata(links) {
    let yearlyData = [];

    for (const element of links) {
        const response = await axios.get(element.document)
            .then((response) => {
                return response.data;
            });

        const resultAndGross = await parseXML(response);

        yearlyData.push(
            {
                year: element.year,
                data: resultAndGross
            }
        );
    };

    return yearlyData;
}

async function parseXML(text) {
    let parser = new DOMParser();
    let result = 0;
    let gross = 0;

    let xmlDoc = parser.parseFromString(text, "text/xml");

    if (xmlDoc.getElementsByTagName("e:ProfitLoss")[0] !== undefined) {
        result = xmlDoc.getElementsByTagName("e:ProfitLoss")[0].childNodes[0].nodeValue / 1000;
    } else if (xmlDoc.getElementsByTagName("fsa:ProfitLoss")[0] !== undefined) {
        result = xmlDoc.getElementsByTagName("fsa:ProfitLoss")[0].childNodes[0].nodeValue / 1000;
    } else if (xmlDoc.getElementsByTagName("g:ProfitLoss")[0] !== undefined) {
        result = xmlDoc.getElementsByTagName("g:ProfitLoss")[0].childNodes[0].nodeValue / 1000;
    }

    if (xmlDoc.getElementsByTagName("e:GrossResult")[0] !== undefined) {
        gross = xmlDoc.getElementsByTagName("e:GrossResult")[0].childNodes[0].nodeValue / 1000;
    } else if (xmlDoc.getElementsByTagName("fsa:GrossProfitLoss")[0] !== undefined) {
        gross = xmlDoc.getElementsByTagName("fsa:GrossProfitLoss")[0].childNodes[0].nodeValue / 1000;
    } else if (xmlDoc.getElementsByTagName("g:GrossProfitLoss")[0] !== undefined) {
        gross = xmlDoc.getElementsByTagName("g:GrossProfitLoss")[0].childNodes[0].nodeValue / 1000;
    } else if (xmlDoc.getElementsByTagName("e:GrossProfitLoss")[0] !== undefined) {
        gross = xmlDoc.getElementsByTagName("e:GrossProfitLoss")[0].childNodes[0].nodeValue / 1000;
    } else if (xmlDoc.getElementsByTagName("fsa:GrossResult")[0] !== undefined) {
        gross = xmlDoc.getElementsByTagName("fsa:GrossResult")[0].childNodes[0].nodeValue / 1000;
    }

    return [result, gross];
}

async function returnCompanyData(data) {
    let obj = {
        vat: data.cvrNummer ? data.cvrNummer : "---",
        name: data.virksomhedMetadata.nyesteNavn.navn ? data.virksomhedMetadata.nyesteNavn.navn : "---",
        city: data.virksomhedMetadata.nyesteBeliggenhedsadresse.postdistrikt ? data.virksomhedMetadata.nyesteBeliggenhedsadresse.postdistrikt : "---",
        startdate: data.virksomhedMetadata.stiftelsesDato ? data.virksomhedMetadata.stiftelsesDato : "---",
        employees: "---",
        industrydesc: data.virksomhedMetadata.nyesteHovedbranche.branchetekst ? data.virksomhedMetadata.nyesteHovedbranche.branchetekst : "---",
        companydesc: data.virksomhedsform[0].langBeskrivelse ? data.virksomhedsform[0].langBeskrivelse : "---"
    }

    if (data.virksomhedMetadata.nyesteErstMaanedsbeskaeftigelse && typeof data.virksomhedMetadata.nyesteErstMaanedsbeskaeftigelse.antalAnsatte !== "undefined") {
        obj.employees = `${data.virksomhedMetadata.nyesteErstMaanedsbeskaeftigelse.antalAnsatte}`;
    }

    return obj;
}

async function returnGraphLink(data) {
    let years = data.map((el) => {return el.year});
    let resultData = data.map((el) => {return el.data[0]});
    let grossData = data.map((el) => {return el.data[1]});

    let url = encodeURI(`https://quickchart.io/chart?c={type:'bar',data:{labels:[${[...years]}],datasets:[{label:'Bruttofortjeneste',data:[${[...grossData]}]},{label:'Resultat',data:[${[...resultData]}]}]}}`);

    return url;
}

// Create function that searches Proff for a name and returns the top 3 results when choosing to search for name in Raycast.
async function returnTopProffResults(name) {
    let parser = new HTMLparser();
    let url = `https://www.proff.dk/branchesøg/?q=${name}`;

    const response = await axios.get(url)
        .then((response) => {
            return response.data;
        }
    );

    let htmlDoc = parser.parseFromString(response);

    let results = htmlDoc.getElementsByClassName("search-container-wrap")[0];
    if (results) {
        results = results.getElementsByClassName("search-block-wrap");
    } else {
        results = [];
    }

    let resultsArray = [];

    if (results.length !== 0) {
        for (const element of results) {
            resultsArray.push({
                name: element.getElementsByClassName("addax-cs_hl_hit_company_name_click")[0].textContent,
                cvr: element.getElementsByClassName("org-number")[0].getAttribute("data-id")
            });
        }
    }

    return resultsArray;
}

// Create function that searches Proff for a cvr number and returns the first result and add it's link as the target when looking at a company in Raycast.
async function returnProffLink(cvr) {
    let parser = new HTMLparser();
    let url = `https://www.proff.dk/branchesøg/?q=${cvr}`;
    const response = await axios.get(url)
        .then((response) => {
            return response.data;
        });

    let htmlDoc = parser.parseFromString(response);

    return 'https://proff.dk' + htmlDoc.getElementsByClassName("addax-cs_hl_hit_company_name_click")[0].getAttribute("href");
}

export { returnXMLdata, returnCompanyData, returnAccountingData, returnGraphLink, returnTopProffResults, returnProffLink };