```fortran
subroutine zla_lin_berr (
        integer n,
        integer nz,
        integer nrhs,
        complex*16, dimension( n, nrhs ) res,
        double precision, dimension( n, nrhs ) ayb,
        double precision, dimension( nrhs ) berr
)
```

ZLA_LIN_BERR computes componentwise relative backward error from
the formula
max(i) ( abs(R(i)) / ( abs(op(A_s))\*abs(Y) + abs(B_s) )(i) )
where abs(Z) is the componentwise absolute value of the matrix
or vector Z.

## Parameters
N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

NZ : INTEGER [in]
> We add (NZ+1)\*SLAMCH( 'Safe minimum' ) to R(i) in the numerator to
> guard against spuriously zero residuals. Default value is N.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrices AYB, RES, and BERR.  NRHS >= 0.

RES : COMPLEX\*16 array, dimension (N,NRHS) [in]
> The residual matrix, i.e., the matrix R in the relative backward
> error formula above.

AYB : DOUBLE PRECISION array, dimension (N, NRHS) [in]
> The denominator in the relative backward error formula above, i.e.,
> the matrix abs(op(A_s))\*abs(Y) + abs(B_s). The matrices A, Y, and B
> are from iterative refinement (see zla_gerfsx_extended.f).

BERR : DOUBLE PRECISION array, dimension (NRHS) [out]
> The componentwise relative backward error from the formula above.
