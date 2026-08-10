```fortran
subroutine spbsvx (
        character fact,
        character uplo,
        integer n,
        integer kd,
        integer nrhs,
        real, dimension( ldab, * ) ab,
        integer ldab,
        real, dimension( ldafb, * ) afb,
        integer ldafb,
        character equed,
        real, dimension( * ) s,
        real, dimension( ldb, * ) b,
        integer ldb,
        real, dimension( ldx, * ) x,
        integer ldx,
        real rcond,
        real, dimension( * ) ferr,
        real, dimension( * ) berr,
        real, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer info
)
```

SPBSVX uses the Cholesky factorization A = U\*\*T\*U or A = L\*L\*\*T to
compute the solution to a real system of linear equations
A \* X = B,
where A is an N-by-N symmetric positive definite band matrix and X
and B are N-by-NRHS matrices.

Error bounds on the solution and a condition estimate are also
provided.

## Parameters
FACT : CHARACTER\*1 [in]
> Specifies whether or not the factored form of the matrix A is
> supplied on entry, and if not, whether the matrix A should be
> equilibrated before it is factored.
> = 'F':  On entry, AFB contains the factored form of A.
> If EQUED = 'Y', the matrix A has been equilibrated
> with scaling factors given by S.  AB and AFB will not
> be modified.
> = 'N':  The matrix A will be copied to AFB and factored.
> = 'E':  The matrix A will be equilibrated if necessary, then
> copied to AFB and factored.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

KD : INTEGER [in]
> The number of superdiagonals of the matrix A if UPLO = 'U',
> or the number of subdiagonals if UPLO = 'L'.  KD >= 0.

NRHS : INTEGER [in]
> The number of right-hand sides, i.e., the number of columns
> of the matrices B and X.  NRHS >= 0.

AB : REAL array, dimension (LDAB,N) [in,out]
> On entry, the upper or lower triangle of the symmetric band
> matrix A, stored in the first KD+1 rows of the array, except
> if FACT = 'F' and EQUED = 'Y', then A must contain the
> equilibrated matrix diag(S)\*A\*diag(S).  The j-th column of A
> is stored in the j-th column of the array AB as follows:
> if UPLO = 'U', AB(KD+1+i-j,j) = A(i,j) for max(1,j-KD)<=i<=j;
> if UPLO = 'L', AB(1+i-j,j)    = A(i,j) for j<=i<=min(N,j+KD).
> See below for further details.
> 
> On exit, if FACT = 'E' and EQUED = 'Y', A is overwritten by
> diag(S)\*A\*diag(S).

LDAB : INTEGER [in]
> The leading dimension of the array A.  LDAB >= KD+1.

AFB : REAL array, dimension (LDAFB,N) [in,out]
> If FACT = 'F', then AFB is an input argument and on entry
> contains the triangular factor U or L from the Cholesky
> factorization A = U\*\*T\*U or A = L\*L\*\*T of the band matrix
> A, in the same storage format as A (see AB).  If EQUED = 'Y',
> then AFB is the factored form of the equilibrated matrix A.
> 
> If FACT = 'N', then AFB is an output argument and on exit
> returns the triangular factor U or L from the Cholesky
> factorization A = U\*\*T\*U or A = L\*L\*\*T.
> 
> If FACT = 'E', then AFB is an output argument and on exit
> returns the triangular factor U or L from the Cholesky
> factorization A = U\*\*T\*U or A = L\*L\*\*T of the equilibrated
> matrix A (see the description of A for the form of the
> equilibrated matrix).

LDAFB : INTEGER [in]
> The leading dimension of the array AFB.  LDAFB >= KD+1.

EQUED : CHARACTER\*1 [in,out]
> Specifies the form of equilibration that was done.
> = 'N':  No equilibration (always true if FACT = 'N').
> = 'Y':  Equilibration was done, i.e., A has been replaced by
> diag(S) \* A \* diag(S).
> EQUED is an input argument if FACT = 'F'; otherwise, it is an
> output argument.

S : REAL array, dimension (N) [in,out]
> The scale factors for A; not accessed if EQUED = 'N'.  S is
> an input argument if FACT = 'F'; otherwise, S is an output
> argument.  If FACT = 'F' and EQUED = 'Y', each element of S
> must be positive.

B : REAL array, dimension (LDB,NRHS) [in,out]
> On entry, the N-by-NRHS right hand side matrix B.
> On exit, if EQUED = 'N', B is not modified; if EQUED = 'Y',
> B is overwritten by diag(S) \* B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

X : REAL array, dimension (LDX,NRHS) [out]
> If INFO = 0 or INFO = N+1, the N-by-NRHS solution matrix X to
> the original system of equations.  Note that if EQUED = 'Y',
> A and B are modified on exit, and the solution to the
> equilibrated system is inv(diag(S))\*X.

LDX : INTEGER [in]
> The leading dimension of the array X.  LDX >= max(1,N).

RCOND : REAL [out]
> The estimate of the reciprocal condition number of the matrix
> A after equilibration (if done).  If RCOND is less than the
> machine precision (in particular, if RCOND = 0), the matrix
> is singular to working precision.  This condition is
> indicated by a return code of INFO > 0.

FERR : REAL array, dimension (NRHS) [out]
> The estimated forward error bound for each solution vector
> X(j) (the j-th column of the solution matrix X).
> If XTRUE is the true solution corresponding to X(j), FERR(j)
> is an estimated upper bound for the magnitude of the largest
> element in (X(j) - XTRUE) divided by the magnitude of the
> largest element in X(j).  The estimate is as reliable as
> the estimate for RCOND, and is almost always a slight
> overestimate of the true error.

BERR : REAL array, dimension (NRHS) [out]
> The componentwise relative backward error of each solution
> vector X(j) (i.e., the smallest relative change in
> any element of A or B that makes X(j) an exact solution).

WORK : REAL array, dimension (3\*N) [out]

IWORK : INTEGER array, dimension (N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, and i is
> <= N:  the leading principal minor of order i of A
> is not positive, so the factorization could not
> be completed, and the solution has not been
> computed. RCOND = 0 is returned.
> = N+1: U is nonsingular, but RCOND is less than machine
> precision, meaning that the matrix is singular
> to working precision.  Nevertheless, the
> solution and error bounds are computed because
> there are a number of situations where the
> computed solution can be more accurate than the
> value of RCOND would suggest.
