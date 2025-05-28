curl -X POST \
  http://localhost:8765 \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "guiAddCards",
    "version": 6,
    "params": {
        "note": {
            "deckName": "Default",
            "modelName": "Cloze",
            "fields": {
                "Text": "The capital of Romania is {{c1::Bucharest}}",
                "Extra": "Romania is a country in Europe"
            },
            "tags": [
              "countries"
            ],
            "picture": [{
                "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/EU-Romania.svg/285px-EU-Romania.svg.png",
                "filename": "romania.png",
                "fields": [
                    "Extra"
                ]
            }]
        }
    }
}'
