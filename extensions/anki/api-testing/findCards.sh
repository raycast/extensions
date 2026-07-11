curl -s -X POST "http://localhost:8765" \
     -H "Content-Type: application/json" \
     -d '{
         "action": "findCards",
         "version": 6,
         "params": {
             "query": "deck:\"testDeckTwo\""
         }
     }'
