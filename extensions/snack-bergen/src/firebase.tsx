import { initializeApp } from "firebase/app";
import { getFirestore, getDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore'
import { getAuth, setPersistence, browserLocalPersistence, signInAnonymously } from "firebase/auth";
import { useEffect, useState } from "react";

const firebaseConfig = {
    apiKey: "AIzaSyA1iLf4dyKPYMSVqCkg4409ShqAvSY5Yks",
    authDomain: "agensplayground.firebaseapp.com",
    projectId: "agensplayground",
    storageBucket: "agensplayground.appspot.com",
    messagingSenderId: "419482701777",
    appId: "1:419482701777:web:b15363ad378a1af63c5af0"
  };
  
  export const app = initializeApp(firebaseConfig);
  export const db = getFirestore(app);
  export const auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Persistant")
  })
  .catch((error) => {
    // Handle Errors here.
    const errorCode = error.code;
    const errorMessage = error.message;
  });

  export async function getOrderDocument(docId) {
    try {
      console.log(`${docId} name`)
      // Create a reference to the document
      const docRef = doc(db, "orders", docId);
  
      // Get the document
      const docSnap = await getDoc(docRef);
  
      // Check if the document exists
      if (docSnap.exists()) {
        // Return the document data
        return docSnap.data();
      } else {
        // Document does not exist
        console.log("No such document!");
        return null;
      }
    } catch (error) {
      console.error("Error getting document:", error);
      throw error;
    }
  }
  
  export const useFirestoreListener = (docPath) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSignedIn, setIsSignedIn] = useState(false);

    useEffect(() => {
      signInAnonymously(auth)
      .then(() => {
        setIsSignedIn(true)
        console.log("Signed in")
      })
      .catch((error) => {
        setIsSignedIn(false)
        console.log(error.message)
      });
    }, []);
  
    useEffect(() => {
      console.log(`Looking for ${docPath}`)
      const docRef = doc(db, docPath);
  
      const unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          //console.log(`Got data: ${snapshot.data().items.length}`)
          setData(snapshot.data().items);
          setLoading(false);
        },
        (err) => {
          setError(err);
          console.log(`Got error: ${err}`)
          setLoading(false);
        }
      );
  
      return () => unsubscribe();
    }, [isSignedIn]);
  
    return { data, loading, error };
  };

  export async function incrementOrderCount(docPath, myOrder) {
    // Reference to the document
    const docRef = doc(db, docPath);
  
    try {
      // Get the document
      const docSnap = await getDoc(docRef);
  
      if (docSnap.exists()) {
        const data = docSnap.data();
        const ordersArray = data.items || [];
  
        // Find the order with the specific orderId
        const orderIndex = ordersArray.findIndex(order => order.id === myOrder.id);
  
        if (orderIndex !== -1) {
          // Increment the count for the found order
          ordersArray[orderIndex].count = (ordersArray[orderIndex].count || 0) + 1;
        } else {
          // Add new order with count set to 1
          ordersArray.push({ ...myOrder, count: 1 });
        }
  
        // Update the document with the modified array
        await updateDoc(docRef, {
          items: ordersArray
        });
        console.log('Document count incremented successfully.');
      } else {
        console.log('Document does not exist.');
      }
    } catch (error) {
      console.error('Error incrementing document count:', error);
    }
  }

  export async function decrementOrderCount(docPath, myOrder) {
    // Reference to the document
    const docRef = doc(db, docPath);
  
    try {
      // Get the document
      const docSnap = await getDoc(docRef);
  
      if (docSnap.exists()) {
        const data = docSnap.data();
        const ordersArray = data.items || [];
  
        // Find the order with the specific orderId
        const orderIndex = ordersArray.findIndex(order => order.id === myOrder.id);
  
        if (orderIndex !== -1) {
          // Increment the count for the found order
          if (((ordersArray[orderIndex].count || 0) - 1) === 0) {
            await updateDoc(docRef, {
              items: ordersArray.filter(order => order.id !== myOrder.id)
            });
          } else {
            ordersArray[orderIndex].count = (ordersArray[orderIndex].count || 0) - 1;
            await updateDoc(docRef, {
              items: ordersArray
            });
          }
        }
        console.log('Document count incremented successfully.');
      } else {
        console.log('Document does not exist.');
      }
    } catch (error) {
      console.error('Error incrementing document count:', error);
    }
  }

  export async function decrementAllOrderCount(docPath, myOrder) {
    // Reference to the document
    const docRef = doc(db, docPath);
  
    try {
      // Get the document
      const docSnap = await getDoc(docRef);
  
      if (docSnap.exists()) {
        const data = docSnap.data();
        const ordersArray = data.items || [];
  
       
  
        // Update the document with the modified array
        await updateDoc(docRef, {
          items: ordersArray.filter(order => order.id !== myOrder.id)
        });
        console.log('Document count incremented successfully.');
      } else {
        console.log('Document does not exist.');
      }
    } catch (error) {
      console.error('Error incrementing document count:', error);
    }
  }