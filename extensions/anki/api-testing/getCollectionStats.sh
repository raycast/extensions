curl -X POST \
     -H "Content-Type: application/json" \
     -d '{
           "action": "getCollectionStatsHTML",
           "version": 6,
           "params": {
             "wholeCollection": true
           }
         }' \
     http://localhost:8765
