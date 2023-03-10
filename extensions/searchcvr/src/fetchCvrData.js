import axios from 'axios';

const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Basic U29nYXJkX0NWUl9JX1NLWUVOOjhhODJlZDQ5LTdjMWUtNDFkMi1iOGY2LWQxMjViOWNiOGVlYQ=='
}

async function searchVirk(cvr) {
    const query = {
        "query": {
            "bool": {
                "must": [
                    {
                        "term": {
                            "Vrvirksomhed.cvrNummer": `${cvr}`
                        }
                    }
                ]
            }
        }
    }

    let url = `http://distribution.virk.dk/cvr-permanent/virksomhed/_search`;

    const data = await axios
        .post(url, query, {headers: headers})
        .then((response) => {
            return {status: 200, data: response.data.hits.hits[0]._source.Vrvirksomhed};
        })
        .catch((error) => {
            return {status: 404, data: error};
        });

    return data;
}

async function accountingVirk(cvr) {

    const query = {
        "query": {
            "bool": {
                "must": [
                    {
                        "term": {
                            "cvrNummer": `${cvr}`
                        }
                    },
                    {
                        "term": {
                            "dokumenter.dokumentMimeType": "xml"
                        }
                    },
                    {
                        "range": {
                            "offentliggoerelsesTidspunkt": {
                                "gt": "2018-01-01T00:00:00.001Z",
                                "lt": "2023-06-01T23:59:59.505Z"
                            }
                        }
                    }
                ]
            }
        }
    }

    let url = `http://distribution.virk.dk/offentliggoerelser/_search`;

    const data = await axios
        .post(url, query, {headers: headers})
        .then((response) => {
            return {status: 200, data: response.data.hits.hits};
        })
        .catch((error) => {
            return {status: 404, data: error};
        });

    return data;
}

export { searchVirk, accountingVirk };