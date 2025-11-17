```fortran
subroutine dlaev2 (
        double precision a,
        double precision b,
        double precision c,
        double precision rt1,
        double precision rt2,
        double precision cs1,
        double precision sn1
)
```

DLAEV2 computes the eigendecomposition of a 2-by-2 symmetric matrix
[  A   B  ]
[  B   C  ].
On return, RT1 is the eigenvalue of larger absolute value, RT2 is the
eigenvalue of smaller absolute value, and (CS1,SN1) is the unit right
eigenvector for RT1, giving the decomposition

[ CS1  SN1 ] [  A   B  ] [ CS1 -SN1 ]  =  [ RT1  0  ]
[-SN1  CS1 ] [  B   C  ] [ SN1  CS1 ]     [  0  RT2 ].

## Parameters
A : DOUBLE PRECISION [in]
> The (1,1) element of the 2-by-2 matrix.

B : DOUBLE PRECISION [in]
> The (1,2) element and the conjugate of the (2,1) element of
> the 2-by-2 matrix.

C : DOUBLE PRECISION [in]
> The (2,2) element of the 2-by-2 matrix.

RT1 : DOUBLE PRECISION [out]
> The eigenvalue of larger absolute value.

RT2 : DOUBLE PRECISION [out]
> The eigenvalue of smaller absolute value.

CS1 : DOUBLE PRECISION [out]

SN1 : DOUBLE PRECISION [out]
> The vector (CS1, SN1) is a unit right eigenvector for RT1.
