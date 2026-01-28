```fortran
subroutine dlaed5 (
        integer i,
        double precision, dimension( 2 ) d,
        double precision, dimension( 2 ) z,
        double precision, dimension( 2 ) delta,
        double precision rho,
        double precision dlam
)
```

This subroutine computes the I-th eigenvalue of a symmetric rank-one
modification of a 2-by-2 diagonal matrix

diag( D )  +  RHO \* Z \* transpose(Z) .

The diagonal elements in the array D are assumed to satisfy

D(i) < D(j)  for  i < j .

We also assume RHO > 0 and that the Euclidean norm of the vector
Z is one.

## Parameters
I : INTEGER [in]
> The index of the eigenvalue to be computed.  I = 1 or I = 2.

D : DOUBLE PRECISION array, dimension (2) [in]
> The original eigenvalues.  We assume D(1) < D(2).

Z : DOUBLE PRECISION array, dimension (2) [in]
> The components of the updating vector.

DELTA : DOUBLE PRECISION array, dimension (2) [out]
> The vector DELTA contains the information necessary
> to construct the eigenvectors.

RHO : DOUBLE PRECISION [in]
> The scalar in the symmetric updating formula.

DLAM : DOUBLE PRECISION [out]
> The computed lambda_I, the I-th updated eigenvalue.
