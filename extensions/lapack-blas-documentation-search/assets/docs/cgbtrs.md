```fortran
subroutine cgbtrs (
        character trans,
        integer n,
        integer kl,
        integer ku,
        integer nrhs,
        complex, dimension( ldab, * ) ab,
        integer ldab,
        integer, dimension( * ) ipiv,
        complex, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

CGBTRS solves a system of linear equations
A \* X = B,  A\*\*T \* X = B,  or  A\*\*H \* X = B
with a general band matrix A using the LU factorization computed
by CGBTRF.

## Parameters
TRANS : CHARACTER\*1 [in]
> Specifies the form of the system of equations.
> = 'N':  A \* X = B     (No transpose)
> = 'T':  A\*\*T \* X = B  (Transpose)
> = 'C':  A\*\*H \* X = B  (Conjugate transpose)

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

KL : INTEGER [in]
> The number of subdiagonals within the band of A.  KL >= 0.

KU : INTEGER [in]
> The number of superdiagonals within the band of A.  KU >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

AB : COMPLEX array, dimension (LDAB,N) [in]
> Details of the LU factorization of the band matrix A, as
> computed by CGBTRF.  U is stored as an upper triangular band
> matrix with KL+KU superdiagonals in rows 1 to KL+KU+1, and
> the multipliers used during the factorization are stored in
> rows KL+KU+2 to 2\*KL+KU+1.

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= 2\*KL+KU+1.

IPIV : INTEGER array, dimension (N) [in]
> The pivot indices; for 1 <= i <= N, row i of the matrix was
> interchanged with row IPIV(i).

B : COMPLEX array, dimension (LDB,NRHS) [in,out]
> On entry, the right hand side matrix B.
> On exit, the solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
