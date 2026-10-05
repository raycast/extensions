```fortran
double precision function zla_gbrcond_x (
        character trans,
        integer n,
        integer kl,
        integer ku,
        complex*16, dimension( ldab, * ) ab,
        integer ldab,
        complex*16, dimension( ldafb, * ) afb,
        integer ldafb,
        integer, dimension( * ) ipiv,
        complex*16, dimension( * ) x,
        integer info,
        complex*16, dimension( * ) work,
        double precision, dimension( * ) rwork
)
```

ZLA_GBRCOND_X Computes the infinity norm condition number of
op(A) \* diag(X) where X is a COMPLEX\*16 vector.

## Parameters
TRANS : CHARACTER\*1 [in]
> Specifies the form of the system of equations:
> = 'N':  A \* X = B     (No transpose)
> = 'T':  A\*\*T \* X = B  (Transpose)
> = 'C':  A\*\*H \* X = B  (Conjugate Transpose = Transpose)

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

KL : INTEGER [in]
> The number of subdiagonals within the band of A.  KL >= 0.

KU : INTEGER [in]
> The number of superdiagonals within the band of A.  KU >= 0.

AB : COMPLEX\*16 array, dimension (LDAB,N) [in]
> On entry, the matrix A in band storage, in rows 1 to KL+KU+1.
> The j-th column of A is stored in the j-th column of the
> array AB as follows:
> AB(KU+1+i-j,j) = A(i,j) for max(1,j-KU)<=i<=min(N,j+kl)

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KL+KU+1.

AFB : COMPLEX\*16 array, dimension (LDAFB,N) [in]
> Details of the LU factorization of the band matrix A, as
> computed by ZGBTRF.  U is stored as an upper triangular
> band matrix with KL+KU superdiagonals in rows 1 to KL+KU+1,
> and the multipliers used during the factorization are stored
> in rows KL+KU+2 to 2\*KL+KU+1.

LDAFB : INTEGER [in]
> The leading dimension of the array AFB.  LDAFB >= 2\*KL+KU+1.

IPIV : INTEGER array, dimension (N) [in]
> The pivot indices from the factorization A = P\*L\*U
> as computed by ZGBTRF; row i of the matrix was interchanged
> with row IPIV(i).

X : COMPLEX\*16 array, dimension (N) [in]
> The vector X in the formula op(A) \* diag(X).

INFO : INTEGER [out]
> = 0:  Successful exit.
> i > 0:  The ith argument is invalid.

WORK : COMPLEX\*16 array, dimension (2\*N). [out]
> Workspace.

RWORK : DOUBLE PRECISION array, dimension (N). [out]
> Workspace.
