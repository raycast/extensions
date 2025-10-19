```fortran
subroutine dlae2 (
        double precision a,
        double precision b,
        double precision c,
        double precision rt1,
        double precision rt2
)
```

DLAE2  computes the eigenvalues of a 2-by-2 symmetric matrix
[  A   B  ]
[  B   C  ].
On return, RT1 is the eigenvalue of larger absolute value, and RT2
is the eigenvalue of smaller absolute value.

## Parameters
A : DOUBLE PRECISION [in]
> The (1,1) element of the 2-by-2 matrix.

B : DOUBLE PRECISION [in]
> The (1,2) and (2,1) elements of the 2-by-2 matrix.

C : DOUBLE PRECISION [in]
> The (2,2) element of the 2-by-2 matrix.

RT1 : DOUBLE PRECISION [out]
> The eigenvalue of larger absolute value.

RT2 : DOUBLE PRECISION [out]
> The eigenvalue of smaller absolute value.
