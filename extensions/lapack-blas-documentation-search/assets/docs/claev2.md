```fortran
subroutine claev2 (
        complex a,
        complex b,
        complex c,
        real rt1,
        real rt2,
        real cs1,
        complex sn1
)
```

CLAEV2 computes the eigendecomposition of a 2-by-2 Hermitian matrix
[  A         B  ]
[  CONJG(B)  C  ].
On return, RT1 is the eigenvalue of larger absolute value, RT2 is the
eigenvalue of smaller absolute value, and (CS1,SN1) is the unit right
eigenvector for RT1, giving the decomposition

[ CS1  CONJG(SN1) ] [    A     B ] [ CS1 -CONJG(SN1) ] = [ RT1  0  ]
[-SN1     CS1     ] [ CONJG(B) C ] [ SN1     CS1     ]   [  0  RT2 ].

## Parameters
A : COMPLEX [in]
> The (1,1) element of the 2-by-2 matrix.

B : COMPLEX [in]
> The (1,2) element and the conjugate of the (2,1) element of
> the 2-by-2 matrix.

C : COMPLEX [in]
> The (2,2) element of the 2-by-2 matrix.

RT1 : REAL [out]
> The eigenvalue of larger absolute value.

RT2 : REAL [out]
> The eigenvalue of smaller absolute value.

CS1 : REAL [out]

SN1 : COMPLEX [out]
> The vector (CS1, SN1) is a unit right eigenvector for RT1.
