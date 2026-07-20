```fortran
subroutine dgbcon (
        character norm,
        integer n,
        integer kl,
        integer ku,
        double precision, dimension( ldab, * ) ab,
        integer ldab,
        integer, dimension( * ) ipiv,
        double precision anorm,
        double precision rcond,
        double precision, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer info
)
```

DGBCON estimates the reciprocal of the condition number of a real
general band matrix A, in either the 1-norm or the infinity-norm,
using the LU factorization computed by DGBTRF.

An estimate is obtained for norm(inv(A)), and the reciprocal of the
condition number is computed as
RCOND = 1 / ( norm(A) \* norm(inv(A)) ).

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies whether the 1-norm condition number or the
> infinity-norm condition number is required:
> = '1' or 'O':  1-norm;
> = 'I':         Infinity-norm.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

KL : INTEGER [in]
> The number of subdiagonals within the band of A.  KL >= 0.

KU : INTEGER [in]
> The number of superdiagonals within the band of A.  KU >= 0.

AB : DOUBLE PRECISION array, dimension (LDAB,N) [in]
> Details of the LU factorization of the band matrix A, as
> computed by DGBTRF.  U is stored as an upper triangular band
> matrix with KL+KU superdiagonals in rows 1 to KL+KU+1, and
> the multipliers used during the factorization are stored in
> rows KL+KU+2 to 2\*KL+KU+1.

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= 2\*KL+KU+1.

IPIV : INTEGER array, dimension (N) [in]
> The pivot indices; for 1 <= i <= N, row i of the matrix was
> interchanged with row IPIV(i).

ANORM : DOUBLE PRECISION [in]
> If NORM = '1' or 'O', the 1-norm of the original matrix A.
> If NORM = 'I', the infinity-norm of the original matrix A.

RCOND : DOUBLE PRECISION [out]
> The reciprocal of the condition number of the matrix A,
> computed as RCOND = 1/(norm(A) \* norm(inv(A))).

WORK : DOUBLE PRECISION array, dimension (3\*N) [out]

IWORK : INTEGER array, dimension (N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
